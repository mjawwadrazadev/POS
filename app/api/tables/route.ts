import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Table } from "@/models/Table";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

export async function GET(req: Request) {
  try {
    await dbConnect();
    let org = await Organization.findOne();
    let branch = await Branch.findOne();

    if (!org || !branch) {
      return NextResponse.json(
        { error: "No organization or branch found. Run /api/seed first." },
        { status: 400 }
      );
    }

    let tables = await Table.find({ branchId: branch._id }).sort({ label: 1 });

    // Auto-seed default restaurant tables if none exist
    if (tables.length === 0) {
      const defaultTables: Array<{
        label: string;
        capacity: number;
        positionX: number;
        positionY: number;
        shape: "square" | "round" | "rect";
        status: "available" | "occupied" | "reserved" | "dirty";
      }> = [
        { label: "Table 01", capacity: 2, positionX: 0, positionY: 0, shape: "square", status: "available" },
        { label: "Table 02", capacity: 4, positionX: 1, positionY: 0, shape: "square", status: "available" },
        { label: "Table 03", capacity: 4, positionX: 2, positionY: 0, shape: "square", status: "available" },
        { label: "Table 04", capacity: 6, positionX: 3, positionY: 0, shape: "rect", status: "available" },
        { label: "Table 05", capacity: 2, positionX: 0, positionY: 1, shape: "square", status: "occupied" },
        { label: "Table 06", capacity: 4, positionX: 1, positionY: 1, shape: "round", status: "dirty" },
        { label: "Table 07", capacity: 8, positionX: 2, positionY: 1, shape: "rect", status: "reserved" },
        { label: "Table 08", capacity: 4, positionX: 3, positionY: 1, shape: "square", status: "available" },
      ];

      tables = await Table.insertMany(
        defaultTables.map((t) => ({
          ...t,
          organizationId: org._id,
          branchId: branch._id,
        }))
      );
    }

    return NextResponse.json({ success: true, count: tables.length, tables });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch restaurant tables" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, tableId, status, label, capacity } = body;

    let org = await Organization.findOne();
    let branch = await Branch.findOne();

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
      { error: error.message || "Failed to update tables" },
      { status: 500 }
    );
  }
}
