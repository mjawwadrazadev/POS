import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import { StaffResetRequest } from "@/models/StaffResetRequest";

// GET: open password/PIN reset requests from this store's staff (store admin only)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden — Store Admin access required" }, { status: 403 });

  await dbConnect();
  const requests = await StaffResetRequest.find({ organizationId: session.organizationId, status: "pending" })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    requests: requests.map((r: any) => ({
      id: String(r._id),
      userId: String(r.userId),
      userName: r.userName,
      userEmail: r.userEmail,
      userRole: r.userRole,
      createdAt: r.createdAt,
    })),
  });
}
