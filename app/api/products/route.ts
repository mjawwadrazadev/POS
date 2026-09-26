import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";
import { sanitizeProductInput } from "@/lib/inventory/productInput";
import { logAudit } from "@/lib/audit/logger";

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
      const safeSearch = escapeRegex(search.slice(0, 100));
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { barcode: { $regex: safeSearch, $options: "i" } },
        { batchNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      query.category = String(category);
    }

    const products = await Product.find(query).sort({ updatedAt: -1 }).limit(1000);
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
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required to add products" }, { status: 403 });
    }

    const body = await req.json();
    const { data, error } = sanitizeProductInput(body, { partial: false });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const openingStock = body.stock === undefined || body.stock === "" ? 0 : Number(body.stock);
    if (!Number.isFinite(openingStock) || openingStock < 0) {
      return NextResponse.json({ error: "Opening stock cannot be negative" }, { status: 400 });
    }

    const newProduct = await Product.create({
      ...data,
      stock: openingStock,
      organizationId: session.organizationId, // never trust a client-supplied organization
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "product.create",
      targetCollection: "Product",
      targetId: newProduct._id as any,
      after: { sku: newProduct.sku, price: newProduct.price, stock: newProduct.stock },
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "A product with this SKU already exists in your store" }, { status: 400 });
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create product" : error.message },
      { status: 400 }
    );
  }
}
