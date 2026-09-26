import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { PayrollRun } from "@/models/PayrollRun";
import { User } from "@/models/User";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";
import { postJournalEntry, isAccountingEnabled, ACCOUNTS } from "@/lib/accounting/ledger";
import { logAudit } from "@/lib/audit/logger";

const PAYROLL_STATUSES = ["draft", "approved", "paid"];

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — salary data is restricted to Managers and Admins" }, { status: 403 });
    }

    const payrolls = await PayrollRun.find({ organizationId: session.organizationId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, count: payrolls.length, payrolls });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch payroll runs" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — insufficient privileges" }, { status: 403 });
    }

    const { month = new Date().toISOString().slice(0, 7) } = await req.json();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) {
      return NextResponse.json({ error: "Month must be in YYYY-MM format" }, { status: 400 });
    }

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found" }, { status: 400 });

    const existing = await PayrollRun.findOne({ organizationId: session.organizationId, month });
    if (existing) {
      return NextResponse.json({ success: true, message: `Payroll draft for ${month} already exists.`, payroll: existing });
    }

    // Salaries come from each staff member's profile (Settings → Team). Staff without a salary are
    // listed with 0 so the admin can see who still needs one before approving.
    const users = await User.find({
      organizationId: session.organizationId,
      isActive: true,
      role: { $in: ["admin", "manager", "cashier"] },
    });

    const entries = users.map((u) => {
      const baseSalary = Number(u.baseSalary) || 0;
      return {
        userId: u._id,
        userName: u.fullName,
        userRole: u.role,
        baseSalary,
        commissionEarned: 0,
        deductions: 0,
        netPay: baseSalary,
      };
    });

    const totalPayroll = entries.reduce((sum, e) => sum + e.netPay, 0);
    const missingSalary = entries.filter((e) => e.baseSalary === 0).map((e) => e.userName);

    const newPayroll = await PayrollRun.create({
      organizationId: session.organizationId,
      branchId: branch._id,
      month,
      entries,
      totalPayroll,
      status: "draft",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          `Payroll draft for ${month} generated!` +
          (missingSalary.length ? ` No salary set for: ${missingSalary.join(", ")} (Settings → Team).` : ""),
        payroll: newPayroll,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to generate payroll" : error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — only admins can approve/pay payroll" }, { status: 403 });
    }

    const { payrollId, status } = await req.json();
    if (!mongoose.isValidObjectId(payrollId) || !PAYROLL_STATUSES.includes(status)) {
      return NextResponse.json({ error: "payrollId and a valid status (draft/approved/paid) are required" }, { status: 400 });
    }

    const current = await PayrollRun.findOne({ _id: payrollId, organizationId: session.organizationId });
    if (!current) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    if (current.status === "paid") {
      return NextResponse.json({ error: "A paid payroll cannot be changed" }, { status: 400 });
    }

    const approvedBy = session.fullName || session.email;

    if (status === "paid") {
      if (current.totalPayroll <= 0) {
        return NextResponse.json({ error: "Payroll total is zero — set staff salaries first" }, { status: 400 });
      }

      // Atomic transition so the salary expense can only be posted once
      const payroll = await PayrollRun.findOneAndUpdate(
        { _id: payrollId, organizationId: session.organizationId, status: { $ne: "paid" } },
        { $set: { status: "paid", approvedBy, paidAt: new Date() } },
        { new: true }
      );
      if (!payroll) return NextResponse.json({ error: "Payroll was already paid" }, { status: 409 });

      let ledgerMessage = "";
      if (await isAccountingEnabled(session.organizationId)) {
        try {
          await postJournalEntry({
            organizationId: payroll.organizationId,
            branchId: payroll.branchId,
            prefix: "JE-SAL",
            referenceId: `PAYROLL-${payroll.month}`,
            description: `Salary payout for ${payroll.entries.length} staff members for ${payroll.month}`,
            lines: [
              { ...ACCOUNTS.SALARIES, type: "debit", amount: payroll.totalPayroll },
              { ...ACCOUNTS.BANK, type: "credit", amount: payroll.totalPayroll },
            ],
          });
          ledgerMessage = " and posted to the Accounting Ledger";
        } catch (ledgerErr) {
          console.error(`[Ledger] Failed to post payroll ${payroll.month}:`, ledgerErr);
          ledgerMessage = " (ledger posting failed — check the ledger audit)";
        }
      }

      await logAudit({
        organizationId: session.organizationId,
        actorId: session.userId,
        actorName: approvedBy,
        actorRole: session.role,
        action: "payroll.paid",
        targetCollection: "PayrollRun",
        targetId: payroll._id as any,
        after: { month: payroll.month, totalPayroll: payroll.totalPayroll },
      });

      return NextResponse.json({
        success: true,
        message: `Payroll marked as PAID (PKR ${payroll.totalPayroll.toLocaleString()})${ledgerMessage}!`,
        payroll,
      });
    }

    current.status = status;
    current.approvedBy = approvedBy;
    await current.save();

    return NextResponse.json({ success: true, message: `Payroll status updated to '${status}'`, payroll: current });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update payroll" : error.message },
      { status: 500 }
    );
  }
}
