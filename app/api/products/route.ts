import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";

// Escape string for safe MongoDB $regex use (prevents ReDoS)
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    // Always scope to session org — never cross-tenant product access
    const query: any = { organizationId: session.organizationId };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { barcode: { $regex: safeSearch, $options: "i" } },
        { batchNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      query.category = category;
    }

    const products = await Product.find(query).sort({ updatedAt: -1 }).limit(100);
    return NextResponse.json({ success: true, count: products.length, products });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch products" : error.message },
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

    // Always use session org — never trust body.organizationId from client
    const newProduct = await Product.create({
      ...body,
      organizationId: session.organizationId, // override any client-supplied value
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create product" : error.message },
      { status: 400 }
    );
  }
}
