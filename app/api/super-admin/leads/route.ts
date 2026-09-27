import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Lead } from "@/models/Lead";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

const STATUSES = ["new", "contacted", "won", "lost"];

// GET: website leads, newest first (?status=new to filter)
export async function GET(req: Request) {
  const auth = await requireSuperAdminAction("manage_leads");
  if (!auth.authorized) return auth.response;

  await dbConnect();
  const status = new URL(req.url).searchParams.get("status");
  const filter = status && STATUSES.includes(status) ? { status } : {};

  const [leads, counts] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  return NextResponse.json({
    success: true,
    leads: leads.map((l: any) => ({ ...l, id: String(l._id), _id: undefined })),
    counts: Object.fromEntries(counts.map((c: any) => [c._id, c.count])),
  });
}

// PATCH: { id, status?, notes? }
export async function PATCH(req: Request) {
  const auth = await requireSuperAdminAction("manage_leads");
  if (!auth.authorized) return auth.response;

  const { id, status, notes } = await req.json();
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid lead" }, { status: 400 });
  if (status !== undefined && !STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await dbConnect();
  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = String(notes).slice(0, 4000);

  const lead = await Lead.findByIdAndUpdate(id, update, { new: true });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
