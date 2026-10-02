import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { ConsultationBill } from "@/models/ConsultationBill";
import { Doctor } from "@/models/Doctor";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth/session";
import { postJournalEntry, isAccountingEnabled, accountForMethod, ACCOUNTS } from "@/lib/accounting/ledger";
import { generateDocNumber, roundMoney } from "@/lib/utils/server";

const VISIT_TYPES = ["new_patient", "follow_up", "emergency"];
const PAYMENT_METHODS = ["cash", "card", "wallet"];

// GET: Fetch consultation bills history
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query: any = { organizationId: session.organizationId };

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    if (doctorId && mongoose.isValidObjectId(doctorId)) query.doctorId = doctorId;

    // Doctor-wise totals are added up in the database, so the report never downloads every bill
    if (searchParams.get("summary") === "doctor") {
      const doctors = await ConsultationBill.aggregate([
        {
          // Aggregation pipelines do not cast strings, so ids must be ObjectIds here
          $match: {
            organizationId: new mongoose.Types.ObjectId(session.organizationId),
            ...(query.doctorId ? { doctorId: new mongoose.Types.ObjectId(String(query.doctorId)) } : {}),
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$doctorNameSnapshot", "Unknown Doctor"] },
            specialization: { $first: "$doctorSpecializationSnapshot" },
            consultationsCount: { $sum: 1 },
            totalRevenue: { $sum: "$feeCharged" },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);
      return NextResponse.json({
        success: true,
        doctors: doctors.map((d) => ({
          name: d._id,
          specialization: d.specialization || "Specialist",
          consultationsCount: d.consultationsCount,
          totalRevenue: d.totalRevenue,
        })),
      });
    }

    // Newest bills only; the history grows without end
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 1000);
    const bills = await ConsultationBill.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({
      success: true,
      bills,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch consultation bills" : error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new Patient Consultation Bill + Perchi Token No + Ledger Posting
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const {
      doctorId,
      visitType = "new_patient",
      feeCharged,
      patientName,
      patientPhone,
      patientAge,
      patientGender = "male",
      paymentMethod = "cash",
    } = body;

    const fee = roundMoney(Number(feeCharged));
    if (!mongoose.isValidObjectId(doctorId) || !patientName || !Number.isFinite(fee) || fee <= 0) {
      return NextResponse.json(
        { error: "Doctor, Patient Name, and a positive Fee Charged are required" },
        { status: 400 }
      );
    }
    if (!VISIT_TYPES.includes(visitType) || !PAYMENT_METHODS.includes(paymentMethod) || !["male", "female", "other"].includes(patientGender)) {
      return NextResponse.json({ error: "Invalid visit type or payment method" }, { status: 400 });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, organizationId: session.organizationId, status: "active" });
    if (!doctor) {
      return NextResponse.json({ error: "Selected Doctor not found" }, { status: 404 });
    }

    const orgId = session.organizationId;
    const branchId = session.branchId || doctor.branchId;

    // Calculate Perchi No / Patient Token Number for Today for this Doctor
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayCount = await ConsultationBill.countDocuments({
      organizationId: orgId,
      doctorId: doctor._id,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const perchiNumber = todayCount + 1;
    const receiptNumber = generateDocNumber("HSP");
    const now = new Date();
    const consultationTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // 1. Create Consultation Bill Document
    const bill = await ConsultationBill.create({
      organizationId: orgId,
      branchId,
      receiptNumber,
      perchiNumber,
      doctorId: doctor._id,
      doctorNameSnapshot: doctor.name,
      doctorSpecializationSnapshot: doctor.specialization,
      doctorPhotoSnapshot: doctor.photo || "",
      visitType,
      feeCharged: fee,
      patientName,
      patientPhone: patientPhone || "",
      patientAge: patientAge ? Number(patientAge) : undefined,
      patientGender,
      paymentMethod,
      receptionistId: session?.userId,
      receptionistName: session.fullName || session.email,
      consultationTime,
      status: "completed",
    });

    // 2. Post a balanced double-entry journal entry (accounting plans only):
    //    Dr Cash/Bank (fee) = Cr Consultation Revenue (hospital share) + Cr Doctor Payable (doctor share)
    if (await isAccountingEnabled(orgId)) {
      try {
        const doctorSharePercent =
          doctor.paymentArrangement === "revenue_share" ? Math.min(Math.max(100 - doctor.hospitalCommissionPercent, 0), 100) : 0;
        const doctorShare = roundMoney((fee * doctorSharePercent) / 100);

        await postJournalEntry({
          organizationId: orgId,
          branchId,
          prefix: "JE-HSP",
          referenceId: receiptNumber,
          description: `Consultation Bill ${receiptNumber} for ${doctor.name} (Patient: ${patientName})`,
          lines: [
            { ...accountForMethod(paymentMethod), type: "debit", amount: fee },
            { ...ACCOUNTS.CONSULTATION, type: "credit", amount: fee - doctorShare },
            { ...ACCOUNTS.DOCTOR_PAYABLE, accountName: `Payable to ${doctor.name}`, type: "credit", amount: doctorShare },
          ],
        });
      } catch (ledgerErr) {
        console.error("Consultation ledger posting failed:", ledgerErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Consultation receipt #${receiptNumber} generated successfully!`,
      bill,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create consultation bill" : error.message },
      { status: 500 }
    );
  }
}
