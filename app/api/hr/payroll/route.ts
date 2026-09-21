import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { PayrollRun } from "@/models/PayrollRun";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { JournalEntry } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — insufficient privileges" }, { status: 403 });
    }

    const body = await req.json();
    const { month = new Date().toISOString().slice(0, 7) } = body;

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization or branch found" }, { status: 400 });
    }

    // Check if payroll draft for month already exists
    const existing = await PayrollRun.findOne({ organizationId: org._id, month });
    if (existing) {
      return NextResponse.json(
        { success: true, message: `Payroll draft for ${month} already exists.`, payroll: existing },
        { status: 200 }
      );
    }

    const users = await User.find({ organizationId: org._id, role: { $ne: "super_admin" } });
    const defaultSalaries: Record<string, number> = {
      admin: 85000,
      manager: 65000,
      cashier: 45000,
    };

    const entries = users.map((u) => {
      const baseSalary = defaultSalaries[u.role] || 45000;
      const commissionEarned = u.role === "cashier" ? 2500 : 5000;
      const deductions = 0;
      const netPay = baseSalary + commissionEarned - deductions;

      return {
        userId: u._id,
        userName: u.fullName,
        userRole: u.role,
        baseSalary,
        commissionEarned,
        deductions,
        netPay,
      };
    });

    const totalPayroll = entries.reduce((sum, e) => sum + e.netPay, 0);

    const newPayroll = await PayrollRun.create({
      organizationId: org._id,
      branchId: branch._id,
      month,
      entries,
      totalPayroll,
      status: "draft",
    });

    return NextResponse.json(
      { success: true, message: `Payroll draft for ${month} generated!`, payroll: newPayroll },
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden — only admins can approve/pay payroll" }, { status: 403 });
    }

    const body = await req.json();
    const { payrollId, status, approvedBy = session.fullName } = body;

    if (!payrollId || !status) {
      return NextResponse.json({ error: "payrollId and status are required" }, { status: 400 });
    }

    const payroll = await PayrollRun.findOne({ _id: payrollId, organizationId: session.organizationId });
    if (!payroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    if (status === "paid") {
      payroll.status = "paid";
      payroll.approvedBy = approvedBy;
      payroll.paidAt = new Date();
      await payroll.save();

      // Post Salary Expense Journal Entry to Ledger using proper IJournalLine schema ({ accountCode, accountName, type, amount })
      await JournalEntry.create({
        organizationId: payroll.organizationId,
        branchId: payroll.branchId,
        entryNumber: `SAL-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        reference: `Monthly Staff Payroll (${payroll.month})`,
        narration: `Salary payout for ${payroll.entries.length} staff members for ${payroll.month}`,
        lines: [
          {
            accountCode: "5010",
            accountName: "Salaries & Wages Expense",
            type: "debit",
            amount: payroll.totalPayroll,
          },
          {
            accountCode: "1020",
            accountName: "Bank Main Account",
            type: "credit",
            amount: payroll.totalPayroll,
          },
        ],
        isBalanced: true,
      });

      return NextResponse.json({
        success: true,
        message: `Payroll marked as PAID and PKR ${payroll.totalPayroll.toLocaleString()} posted to Accounting Ledger!`,
        payroll,
      });
    }

    payroll.status = status;
    payroll.approvedBy = approvedBy;
    await payroll.save();

    return NextResponse.json({
      success: true,
      message: `Payroll status updated to '${status}'`,
      payroll,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update payroll" : error.message },
      { status: 500 }
    );
  }
}
