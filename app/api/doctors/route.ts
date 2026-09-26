import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Doctor } from "@/models/Doctor";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";

// GET: Fetch doctors for the active organization & branch
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query: any = { organizationId: session.organizationId };

    const { searchParams } = new URL(req.url);
    const statusOnly = searchParams.get("status");
    if (statusOnly === "active" || statusOnly === "inactive") {
      query.status = statusOnly;
    }

    const doctors = await Doctor.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      doctors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch doctors list" : error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new Doctor entry with fees & revenue share commission
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
    }

    const body = await req.json();

    const {
      name,
      specialization,
      registrationNumber,
      photo,
      fees,
      hospitalCommissionPercent = 20,
      paymentArrangement = "revenue_share",
      availableDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    } = body;

    if (!name || !specialization) {
      return NextResponse.json(
        { error: "Doctor Name and Specialization are required" },
        { status: 400 }
      );
    }

    const orgId = session.organizationId;
    const branch = await resolveBranch(session);
    if (!branch) {
      return NextResponse.json({ error: "Missing Organization or Branch Context" }, { status: 400 });
    }
    const branchId = branch._id;

    const commission = Number(hospitalCommissionPercent);
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      return NextResponse.json({ error: "Hospital commission must be between 0 and 100%" }, { status: 400 });
    }

    const newDoctor = await Doctor.create({
      organizationId: orgId,
      branchId,
      name,
      specialization,
      registrationNumber: registrationNumber || "",
      photo: photo || "", // Doctor Image URL or Base64 Avatar
      fees: {
        newPatient: Number(fees?.newPatient || 2000),
        followUp: Number(fees?.followUp || 1000),
        emergency: Number(fees?.emergency || 3000),
      },
      hospitalCommissionPercent: commission,
      paymentArrangement,
      availableDays,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      message: `Doctor '${name}' added successfully!`,
      doctor: newDoctor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create doctor entry" : error.message },
      { status: 500 }
    );
  }
}
