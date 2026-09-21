import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { StockTransfer } from "@/models/StockTransfer";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transfers = await StockTransfer.find({ organizationId: session.organizationId })
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: transfers.length, transfers });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch stock transfers" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fromBranchId, toBranchId, items, notes, requestedBy = session.fullName } = body;

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json(
        { error: "Source branch and destination branch are required" },
        { status: 400 }
      );
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { error: "Source and destination branches cannot be the same" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Transfer must contain at least one product item" },
        { status: 400 }
      );
    }

    const org = await Organization.findById(session.organizationId);
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify stock availability at source branch
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, organizationId: org._id });
      if (!product) {
        return NextResponse.json({ error: `Product not found` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for '${product.name}' (Available: ${product.stock}, Requested: ${item.quantity})` },
          { status: 400 }
        );
      }
    }

    // Deduct stock from source branch
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, organizationId: org._id });
      if (product) {
        product.stock -= item.quantity;
        await product.save();

        processedItems.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
        });
      }
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

    const transfer = await StockTransfer.create({
      organizationId: org._id,
      transferNumber,
      fromBranchId,
      toBranchId,
      items: processedItems,
      status: "in_transit",
      requestedBy,
      notes,
    });

    return NextResponse.json(
      { success: true, message: "Stock transfer created and in transit!", transfer },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create stock transfer" : error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "admin" && session.role !== "manager" && session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden — insufficient role" }, { status: 403 });
    }

    const body = await req.json();
    const { transferId, action, approvedBy = session.fullName } = body;

    if (!transferId || !action) {
      return NextResponse.json({ error: "transferId and action are required" }, { status: 400 });
    }

    const transfer = await StockTransfer.findOne({ _id: transferId, organizationId: session.organizationId });
    if (!transfer) {
      return NextResponse.json({ error: "Stock transfer record not found" }, { status: 404 });
    }

    if (action === "receive") {
      if (transfer.status === "received") {
        return NextResponse.json({ error: "Transfer is already received" }, { status: 400 });
      }

      transfer.status = "received";
      transfer.approvedBy = approvedBy;
      transfer.receivedAt = new Date();
      await transfer.save();

      // Add stock to target branch product inventory
      for (const item of transfer.items) {
        let targetProduct = await Product.findOne({
          organizationId: session.organizationId,
          branchId: transfer.toBranchId,
          sku: item.sku,
        });

        if (targetProduct) {
          targetProduct.stock += item.quantity;
          await targetProduct.save();
        } else {
          // Clone product entry for target branch if not exists
          const sourceProduct = await Product.findById(item.productId);
          if (sourceProduct) {
            await Product.create({
              organizationId: transfer.organizationId,
              branchId: transfer.toBranchId,
              name: sourceProduct.name,
              sku: sourceProduct.sku,
              barcode: sourceProduct.barcode,
              category: sourceProduct.category,
              price: sourceProduct.price,
              costPrice: sourceProduct.costPrice,
              stock: item.quantity,
              unit: sourceProduct.unit,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Stock transfer confirmed and stock added to target branch!",
        transfer,
      });
    }

    if (action === "cancel") {
      if (transfer.status === "received") {
        return NextResponse.json({ error: "Cannot cancel an already received transfer" }, { status: 400 });
      }

      // Revert stock back to source branch
      for (const item of transfer.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      transfer.status = "cancelled";
      await transfer.save();

      return NextResponse.json({
        success: true,
        message: "Stock transfer cancelled and inventory reverted to source branch.",
        transfer,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update stock transfer" : error.message },
      { status: 500 }
    );
  }
}
