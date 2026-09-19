import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

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
      paymentMethod,
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

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) {
        throw new Error(`Product ${item.name} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }

      // Deduct stock in real-time
      product.stock -= item.quantity;
      await product.save();

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
        batchNumber: product.batchNumber,
      });
    }

    const taxAmount = Math.round(subtotal * 0.16); // 16% sales tax
    const discountTotal = Math.round(subtotal * (discountGlobalPercent / 100));
    const grandTotal = Math.max(0, subtotal + taxAmount - discountTotal);

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
      paymentMethod: paymentMethod || "cash",
      status: "completed",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order completed & stock updated!",
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
