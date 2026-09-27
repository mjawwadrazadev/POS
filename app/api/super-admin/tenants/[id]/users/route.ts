import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { StaffResetRequest } from "@/models/StaffResetRequest";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

// GET: a tenant's store accounts (owner and staff), so platform support can reset any of them
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminAction("reset_user_pin");
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });

  await dbConnect();
  const [users, pending] = await Promise.all([
    User.find({ organizationId: id, role: { $in: ["admin", "manager", "cashier"] } })
      .select("fullName email role isActive createdAt")
      .sort({ role: 1, createdAt: 1 })
      .lean(),
    StaffResetRequest.find({ organizationId: id, status: "pending" }).select("userId").lean(),
  ]);
  const waiting = new Set(pending.map((p: any) => String(p.userId)));

  return NextResponse.json({
    success: true,
    users: users.map((u: any) => ({
      id: String(u._id),
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      resetRequested: waiting.has(String(u._id)),
    })),
  });
}
