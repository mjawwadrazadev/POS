import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { ConsultationBill } from "@/models/ConsultationBill";
import { Doctor } from "@/models/Doctor";
import { Organization } from "@/models/Organization";
import { JournalEntry, IJournalLine } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";

// GET: Fetch consultation bills history
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query: any = { organizationId: session.organizationId };

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    if (doctorId) query.doctorId = doctorId;

    const bills = await ConsultationBill.find(query).sort({ createdAt: -1 }).lean();

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
      receptionistName,
    } = body;

    if (!doctorId || !patientName || !feeCharged) {
      return NextResponse.json(
        { error: "Doctor, Patient Name, and Fee Charged are required" },
        { status: 400 }
      );
    }

    const doctor = await Doctor.findOne({ _id: doctorId, organizationId: session.organizationId });
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
      doctorId: doctor._id,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const perchiNumber = todayCount + 1;
    const receiptNumber = `HSP-${Date.now().toString().slice(-6)}`;
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
      feeCharged: Number(feeCharged),
      patientName,
      patientPhone: patientPhone || "",
      patientAge: patientAge ? Number(patientAge) : undefined,
      patientGender,
      paymentMethod,
      receptionistId: session?.userId,
      receptionistName: receptionistName || session?.fullName || "Receptionist",
      consultationTime,
      status: "completed",
    });

    // 2. Post Double-Entry Journal Entry if Accounting is enabled
    try {
      const org = await Organization.findById(orgId).lean();
      const isAccountingEnabled = org?.planTier === "billing_accounting";

      if (isAccountingEnabled) {
        const assetAccountCode = paymentMethod === "cash" ? "1010-CASH" : "1020-BANK";
        const assetAccountName = paymentMethod === "cash" ? "Cash on Hand" : "Bank Merchant Account";

        const lines: IJournalLine[] = [
          {
            accountCode: assetAccountCode,
            accountName: assetAccountName,
            type: "debit",
            amount: Number(feeCharged),
          },
          {
            accountCode: "4020-CONSULTATION-REVENUE",
            accountName: "Hospital Consultation Revenue",
            type: "credit",
            amount: Number(feeCharged),
          },
        ];

        // If revenue share, record doctor payable liability
        if (doctor.paymentArrangement === "revenue_share" && doctor.hospitalCommissionPercent > 0) {
          const doctorCutPercent = 100 - doctor.hospitalCommissionPercent;
          const doctorShare = (Number(feeCharged) * doctorCutPercent) / 100;

          lines.push({
            accountCode: "2030-DOCTOR-PAYABLE",
            accountName: `Payable to ${doctor.name}`,
            type: "credit",
            amount: doctorShare,
          });
        }

        const totalDebit = lines.filter((l) => l.type === "debit").reduce((sum, l) => sum + l.amount, 0);
        const totalCredit = lines.filter((l) => l.type === "credit").reduce((sum, l) => sum + l.amount, 0);

        await JournalEntry.create({
          organizationId: orgId,
          branchId,
          entryNumber: `JE-HSP-${Date.now().toString().slice(-6)}`,
          referenceId: receiptNumber,
          description: `Consultation Bill ${receiptNumber} for ${doctor.name} (Patient: ${patientName})`,
          lines,
          totalDebit,
          totalCredit,
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        });
      }
    } catch (ledgerErr) {
      console.error("Consultation ledger posting warning:", ledgerErr);
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
