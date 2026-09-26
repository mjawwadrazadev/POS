import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";
import { sanitizeProductInput } from "@/lib/inventory/productInput";
import { logAudit } from "@/lib/audit/logger";

async function requireInventoryManager() {
  const session = await getSession();
  if (!session) return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "admin" && session.role !== "manager") {
    return { session: null, response: NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 }) };
  }
  return { session, response: null };
}

/**
 * PATCH: update product details and/or adjust stock.
 * Stock is changed only through `stockAdjustment` (a signed delta), applied atomically and never below zero,
 * so a concurrent sale cannot be overwritten by an edit form holding a stale stock value.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { session, response } = await requireInventoryManager();
    if (!session) return response!;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const body = await req.json();
    const { data, error } = sanitizeProductInput(body, { partial: true });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const before = await Product.findOne({ _id: id, organizationId: session.organizationId }).lean();
    if (!before) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const update: any = {};
    const unset: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) unset[k] = "";
      else update[k] = v;
    }

    const filter: any = { _id: id, organizationId: session.organizationId };
    const ops: any = {};
    if (Object.keys(update).length) ops.$set = update;
    if (Object.keys(unset).length) ops.$unset = unset;

    let stockAdjustment = 0;
    if (body.stockAdjustment !== undefined && body.stockAdjustment !== 0) {
      stockAdjustment = Number(body.stockAdjustment);
      if (!Number.isInteger(stockAdjustment)) {
        return NextResponse.json({ error: "Stock adjustment must be a whole number" }, { status: 400 });
      }
      ops.$inc = { stock: stockAdjustment };
      if (stockAdjustment < 0) filter.stock = { $gte: -stockAdjustment };
    }

    if (Object.keys(ops).length === 0) {
      return NextResponse.json({ success: true, product: before });
    }

    const product = await Product.findOneAndUpdate(filter, ops, { new: true, runValidators: true });
    if (!product) {
      return NextResponse.json({ error: `Cannot remove ${-stockAdjustment} units — only ${before.stock} in stock` }, { status: 400 });
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: stockAdjustment !== 0 ? "stock.adjust" : "product.update",
      targetCollection: "Product",
      targetId: product._id as any,
      before: { price: before.price, stock: before.stock, sku: before.sku },
      after: { price: product.price, stock: product.stock, sku: product.sku, reason: body.reason },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "A product with this SKU already exists in your store" }, { status: 400 });
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update product" : error.message },
      { status: 500 }
    );
  }
}

// DELETE: remove a product. Past orders keep their own name/SKU snapshot, so sales history is unaffected.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { session, response } = await requireInventoryManager();
    if (!session) return response!;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const deleted = await Product.findOneAndDelete({ _id: id, organizationId: session.organizationId });
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "product.delete",
      targetCollection: "Product",
      targetId: deleted._id as any,
      before: { sku: deleted.sku, name: deleted.name, stock: deleted.stock },
    });

    return NextResponse.json({ success: true, message: `'${deleted.name}' deleted` });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to delete product" : error.message },
      { status: 500 }
    );
  }
}
