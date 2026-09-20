import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { StockTransfer } from "@/models/StockTransfer";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const transfers = await StockTransfer.find()
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: transfers.length, transfers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { fromBranchId, toBranchId, items, notes, requestedBy = "Store Manager" } = body;

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

    let org = await Organization.findOne();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify stock availability at source branch
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productName || item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} at source branch. Available: ${product.stock}`);
      }
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

    const transfer = await StockTransfer.create({
      organizationId: org._id,
      transferNumber,
      fromBranchId,
      toBranchId,
      items,
      notes,
      requestedBy,
      status: "in_transit",
    });

    // Deduct stock from source branch product catalog
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
      }
    }

    return NextResponse.json(
      { success: true, message: "Stock transfer dispatched in-transit!", transfer },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create stock transfer" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { transferId, action, approvedBy = "Warehouse Manager" } = body;

    if (!transferId || !action) {
      return NextResponse.json({ error: "transferId and action are required" }, { status: 400 });
    }

    const transfer = await StockTransfer.findById(transferId);
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
      { error: error.message || "Failed to update stock transfer" },
      { status: 500 }
    );
  }
}
