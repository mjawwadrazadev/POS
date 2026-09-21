import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Doctor } from "@/models/Doctor";
import { getSession } from "@/lib/auth/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const doctor = await Doctor.findOne({ _id: id, organizationId: session.organizationId });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    if (body.name !== undefined) doctor.name = body.name;
    if (body.specialization !== undefined) doctor.specialization = body.specialization;
    if (body.registrationNumber !== undefined) doctor.registrationNumber = body.registrationNumber;
    if (body.photo !== undefined) doctor.photo = body.photo;
    if (body.fees !== undefined) doctor.fees = body.fees;
    if (body.hospitalCommissionPercent !== undefined) doctor.hospitalCommissionPercent = body.hospitalCommissionPercent;
    if (body.paymentArrangement !== undefined) doctor.paymentArrangement = body.paymentArrangement;
    if (body.availableDays !== undefined) doctor.availableDays = body.availableDays;
    if (body.status !== undefined) doctor.status = body.status;

    await doctor.save();

    return NextResponse.json({
      success: true,
      message: `Doctor '${doctor.name}' updated successfully!`,
      doctor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update doctor entry" : error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const doctor = await Doctor.findOne({ _id: id, organizationId: session.organizationId });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Soft-deactivate to preserve historical consultation bills
    doctor.status = "inactive";
    await doctor.save();

    return NextResponse.json({
      success: true,
      message: `Doctor '${doctor.name}' set to inactive.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to deactivate doctor entry" : error.message },
      { status: 500 }
    );
  }
}
