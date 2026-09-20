import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { CounterSession } from "@/models/CounterSession";
import { deductStockFEFO } from "@/lib/inventory/fefo";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status) query.status = status;

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      items,
      orderType,
      tableNumber,
      cashierName,
      customerName,
      paymentMethod = "cash",
      payments = [],
      discountGlobalPercent = 0,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Default Org & Branch IDs
    let org = await Organization.findOne();
    let branch = await Branch.findOne();

    if (!org || !branch) {
      return NextResponse.json(
        { error: "No organization or branch found. Run /api/seed first." },
        { status: 400 }
      );
    }

    // Check for open counter shift
    const activeSession = await CounterSession.findOne({
      branchId: branch._id,
      status: "open",
    });

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) {
        throw new Error(`Product ${item.name} not found`);
      }

      // Deduct stock using FEFO batch strategy
      const fefoResult = await deductStockFEFO(product._id, branch._id, item.quantity);

      const itemTotal = item.price * item.quantity - (item.discount || 0);
      subtotal += itemTotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discount || 0,
        total: itemTotal,
        batchNumber: fefoResult.primaryBatchNumber || product.batchNumber,
      });
    }

    const taxAmount = Math.round(subtotal * 0.16); // 16% sales tax
    const discountTotal = Math.round(subtotal * (discountGlobalPercent / 100));
    const grandTotal = Math.max(0, subtotal + taxAmount - discountTotal);

    // Validate split payments if paymentMethod === "split"
    if (paymentMethod === "split") {
      if (!payments || payments.length === 0) {
        return NextResponse.json(
          { error: "Split payment details are required when payment method is 'split'" },
          { status: 400 }
        );
      }

      const totalSplitPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      if (Math.abs(totalSplitPaid - grandTotal) > 1) {
        return NextResponse.json(
          { error: `Split payment total (PKR ${totalSplitPaid}) does not equal order total (PKR ${grandTotal})` },
          { status: 400 }
        );
      }
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder = await Order.create({
      organizationId: org._id,
      branchId: branch._id,
      orderNumber,
      orderType: orderType || "retail_sale",
      tableNumber,
      cashierName: cashierName || "Ahmed Ali",
      customerName: customerName || "Walk-in Customer",
      items: processedItems,
      subtotal,
      taxAmount,
      discountTotal,
      grandTotal,
      paymentMethod,
      payments: paymentMethod === "split" ? payments : undefined,
      counterSessionId: activeSession ? activeSession._id : undefined,
      status: "completed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order completed & FEFO batch stock updated!",
        order: newOrder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process order" },
      { status: 400 }
    );
  }
}
