import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";
import { CounterSession } from "@/models/CounterSession";
import { deductStockFEFO, restoreStockDeductions, FEFODeductionResult } from "@/lib/inventory/fefo";
import { getSession, verifyToken } from "@/lib/auth/session";
import { verifyOverrideToken, MAX_UNAPPROVED_DISCOUNT_PERCENT } from "@/lib/auth/override";
import { resolveBranch } from "@/lib/tenant/resolveBranch";
import { postSalesOrderToLedger, isAccountingEnabled } from "@/lib/accounting/ledger";
import { generateDocNumber, roundMoney } from "@/lib/utils/server";

class ValidationError extends Error {}

const ORDER_TYPES = ["dine_in", "takeaway", "delivery", "retail_sale", "prescription"];
const PAYMENT_METHODS = ["cash", "card", "wallet", "split"];
const SPLIT_METHODS = ["cash", "card", "wallet", "store_credit"];
const ORDER_STATUSES = ["completed", "held", "voided", "partially_refunded", "refunded"];

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = { organizationId: session.organizationId };
    if (status && ORDER_STATUSES.includes(status)) query.status = status;

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch orders" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const deductions: FEFODeductionResult[] = [];

  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      items,
      orderType = "retail_sale",
      tableNumber,
      customerName,
      paymentMethod = "cash",
      payments = [],
      discountGlobalPercent = 0,
      overrideToken,
      clientRef,
    } = body;

    // ─── 1. Validate request shape ───
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Order must contain at least one item" }, { status: 400 });
    }
    if (!ORDER_TYPES.includes(orderType)) {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const globalPct = Number(discountGlobalPercent);
    if (!Number.isFinite(globalPct) || globalPct < 0 || globalPct > 100) {
      return NextResponse.json({ error: "Discount must be between 0% and 100%" }, { status: 400 });
    }

    // Merge duplicate lines and validate quantities / per-line discounts
    const lines = new Map<string, { quantity: number; discount: number }>();
    for (const item of items) {
      const id = String(item?.id ?? "");
      const quantity = Number(item?.quantity);
      const discount = Number(item?.discount || 0);
      if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: `Invalid product reference '${item?.name || id}'` }, { status: 400 });
      }
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100000) {
        return NextResponse.json({ error: `Invalid quantity for '${item?.name || id}'` }, { status: 400 });
      }
      if (!Number.isFinite(discount) || discount < 0) {
        return NextResponse.json({ error: `Invalid discount for '${item?.name || id}'` }, { status: 400 });
      }
      const existing = lines.get(id);
      lines.set(id, {
        quantity: (existing?.quantity || 0) + quantity,
        discount: (existing?.discount || 0) + discount,
      });
    }

    // ─── 2. Idempotency for offline-queued orders ───
    const ref = typeof clientRef === "string" && clientRef.length <= 100 ? clientRef : undefined;
    if (ref) {
      const already = await Order.findOne({ organizationId: session.organizationId, clientRef: ref });
      if (already) {
        return NextResponse.json({ success: true, duplicate: true, order: already }, { status: 200 });
      }
    }

    const org = await Organization.findById(session.organizationId);
    const branch = await resolveBranch(session);
    if (!org || !branch) {
      return NextResponse.json({ error: "No organization or branch found for this account." }, { status: 400 });
    }

    // ─── 3. Price every line from the database — never trust client prices ───
    const productIds = [...lines.keys()];
    const products = await Product.find({ _id: { $in: productIds }, organizationId: org._id });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products were not found in this store" }, { status: 400 });
    }
    const productById = new Map(products.map((p) => [(p._id as any).toString(), p]));

    let grossTotal = 0;
    let itemDiscountTotal = 0;
    const pricedLines = productIds.map((id) => {
      const product = productById.get(id)!;
      const { quantity, discount } = lines.get(id)!;
      const gross = roundMoney(product.price * quantity);
      if (discount > gross) {
        throw new ValidationError(`Discount on '${product.name}' exceeds the line amount`);
      }
      grossTotal += gross;
      itemDiscountTotal += discount;
      return { product, quantity, discount, total: roundMoney(gross - discount) };
    });

    const subtotal = roundMoney(pricedLines.reduce((s, l) => s + l.total, 0));
    const discountTotal = roundMoney(subtotal * (globalPct / 100));
    const taxRate = Number(org.taxRate) || 0;
    const taxable = roundMoney(subtotal - discountTotal);
    const taxAmount = roundMoney(taxable * (taxRate / 100));
    const grandTotal = roundMoney(taxable + taxAmount);

    // ─── 4. Discount authorization (server-enforced) ───
    const effectiveDiscountPct = grossTotal > 0 ? ((itemDiscountTotal + discountTotal) / grossTotal) * 100 : 0;
    let discountApprovedBy: string | undefined;
    if (effectiveDiscountPct > MAX_UNAPPROVED_DISCOUNT_PERCENT + 0.001) {
      if (session.role === "cashier") {
        if (!verifyOverrideToken(overrideToken, session.organizationId, session.userId)) {
          return NextResponse.json(
            { error: `Discounts above ${MAX_UNAPPROVED_DISCOUNT_PERCENT}% require Manager/Admin PIN approval` },
            { status: 403 }
          );
        }
        discountApprovedBy = (verifyToken(overrideToken) as any)?.approverName;
      } else {
        discountApprovedBy = session.fullName || session.email;
      }
    }

    // ─── 5. Validate split payments before touching stock ───
    let splitPayments: { method: string; amount: number; reference?: string }[] | undefined;
    if (paymentMethod === "split") {
      if (!Array.isArray(payments) || payments.length === 0) {
        return NextResponse.json({ error: "Split payment details are required when payment method is 'split'" }, { status: 400 });
      }
      splitPayments = payments.map((p: any) => ({
        method: String(p?.method),
        amount: roundMoney(Number(p?.amount) || 0),
        reference: p?.reference ? String(p.reference) : undefined,
      }));
      if (splitPayments.some((p) => !SPLIT_METHODS.includes(p.method) || p.amount < 0)) {
        return NextResponse.json({ error: "Invalid split payment entry" }, { status: 400 });
      }
      const totalSplitPaid = roundMoney(splitPayments.reduce((sum, p) => sum + p.amount, 0));
      if (Math.abs(totalSplitPaid - grandTotal) > 1) {
        return NextResponse.json(
          { error: `Split payment total (${org.currency} ${totalSplitPaid}) does not equal order total (${org.currency} ${grandTotal})` },
          { status: 400 }
        );
      }
    }

    // ─── 6. Deduct stock (atomic per item, rolled back on any failure) ───
    const processedItems = [];
    for (const line of pricedLines) {
      const fefo = await deductStockFEFO(org._id as any, line.product._id as any, branch._id as any, line.quantity);
      deductions.push(fefo);
      processedItems.push({
        productId: line.product._id,
        productName: line.product.name,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPrice: line.product.price,
        unitCost: line.product.costPrice || 0,
        discount: line.discount,
        total: line.total,
        batchNumber: fefo.primaryBatchNumber,
        refundedQuantity: 0,
      });
    }

    const activeShift = await CounterSession.findOne({ branchId: branch._id, status: "open" });

    const newOrder = await Order.create({
      organizationId: org._id,
      branchId: branch._id,
      orderNumber: generateDocNumber("ORD"),
      orderType,
      tableNumber: tableNumber ? String(tableNumber) : undefined,
      cashierId: session.userId,
      cashierName: session.fullName || session.name || session.email,
      customerName: customerName ? String(customerName).slice(0, 120) : "Walk-in Customer",
      items: processedItems,
      subtotal,
      taxAmount,
      taxRate,
      discountTotal,
      discountGlobalPercent: globalPct,
      discountApprovedBy,
      grandTotal,
      paymentMethod,
      payments: splitPayments,
      counterSessionId: activeShift ? activeShift._id : undefined,
      status: "completed",
      clientRef: ref,
      syncedOffline: !!ref,
    });
    deductions.length = 0; // order persisted — stock changes are now final

    // ─── 7. Post to the general ledger (accounting plans only) ───
    if (await isAccountingEnabled(org._id as any)) {
      try {
        const entry = await postSalesOrderToLedger({
          organizationId: org._id as any,
          branchId: branch._id as any,
          orderNumber: newOrder.orderNumber,
          grandTotal,
          taxAmount,
          paymentMethod,
          payments: splitPayments,
        });
        newOrder.journalEntryId = entry._id as any;
        await newOrder.save();
      } catch (ledgerErr) {
        // The sale itself is valid; the ledger audit (/api/accounting/audit) will surface the missing entry
        console.error(`[Ledger] Failed to post sale ${newOrder.orderNumber}:`, ledgerErr);
      }
    }

    return NextResponse.json(
      { success: true, message: "Order completed & stock updated!", order: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    if (deductions.length > 0) {
      await restoreStockDeductions(deductions).catch((e) => console.error("[Orders] Stock rollback failed:", e));
    }
    const isClientError = error instanceof ValidationError || /stock|not found|retry/i.test(error?.message || "");
    return NextResponse.json(
      {
        error:
          isClientError || process.env.NODE_ENV !== "production"
            ? error.message
            : "Failed to process order",
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}

