import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Organization } from "@/models/Organization";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { batchNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      query.category = category;
    }

    const products = await Product.find(query).sort({ updatedAt: -1 }).limit(100);
    return NextResponse.json({ success: true, count: products.length, products });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Fetch default org if not provided
    let orgId = body.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      if (org) orgId = org._id;
    }

    const newProduct = await Product.create({
      ...body,
      organizationId: orgId,
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 400 }
    );
  }
}
