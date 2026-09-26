import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Table } from "@/models/Table";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";

const TABLE_STATUSES = ["available", "occupied", "reserved", "dirty"];

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found." }, { status: 400 });

    const tables = await Table.find({ organizationId: session.organizationId, branchId: branch._id }).sort({ label: 1 });
    return NextResponse.json({ success: true, count: tables.length, tables });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch restaurant tables" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, tableId, status, label, capacity } = await req.json();

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found." }, { status: 400 });

    if (action === "update_status") {
      if (!mongoose.isValidObjectId(tableId) || !TABLE_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Valid tableId and status are required" }, { status: 400 });
      }
      const table = await Table.findOneAndUpdate(
        { _id: tableId, organizationId: session.organizationId },
        { $set: { status } },
        { new: true }
      );
      if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Table status updated!", table });
    }

    if (action === "create") {
      if (session.role !== "admin" && session.role !== "manager") {
        return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
      }
      const cleanLabel = String(label || "").trim();
      if (!cleanLabel) return NextResponse.json({ error: "Table label is required" }, { status: 400 });

      if (await Table.exists({ organizationId: session.organizationId, branchId: branch._id, label: cleanLabel })) {
        return NextResponse.json({ error: `Table '${cleanLabel}' already exists` }, { status: 400 });
      }

      const cap = Number(capacity) || 4;
      const newTable = await Table.create({
        organizationId: session.organizationId,
        branchId: branch._id,
        label: cleanLabel,
        capacity: Math.min(Math.max(cap, 1), 50),
        status: "available",
      });
      return NextResponse.json({ success: true, message: "New table added!", table: newTable }, { status: 201 });
    }

    if (action === "delete") {
      if (session.role !== "admin" && session.role !== "manager") {
        return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
      }
      if (!mongoose.isValidObjectId(tableId)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });
      const deleted = await Table.findOneAndDelete({ _id: tableId, organizationId: session.organizationId });
      if (!deleted) return NextResponse.json({ error: "Table not found" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Table removed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update tables" : error.message },
      { status: 500 }
    );
  }
}
