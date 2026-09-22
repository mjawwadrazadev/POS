import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Table } from "@/models/Table";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json(
        { error: "No organization or branch found." },
        { status: 400 }
      );
    }

    const tables = await Table.find({ branchId: branch._id }).sort({ label: 1 });

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

    const body = await req.json();
    const { action, tableId, status, label, capacity } = body;

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (action === "update_status" && tableId) {
      const table = await Table.findById(tableId);
      if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

      table.status = status || table.status;
      await table.save();

      return NextResponse.json({ success: true, message: "Table status updated!", table });
    }

    if (action === "create") {
      const newTable = await Table.create({
        organizationId: org._id,
        branchId: branch._id,
        label: label || `Table ${Date.now().toString().slice(-2)}`,
        capacity: capacity || 4,
        status: "available",
      });

      return NextResponse.json({ success: true, message: "New table added!", table: newTable }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update tables" : error.message },
      { status: 500 }
    );
  }
}
