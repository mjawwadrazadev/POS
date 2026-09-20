import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { PayrollRun } from "@/models/PayrollRun";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { JournalEntry } from "@/models/JournalEntry";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const payrolls = await PayrollRun.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, count: payrolls.length, payrolls });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch payroll runs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { month = new Date().toISOString().slice(0, 7) } = body;

    let org = await Organization.findOne();
    let branch = await Branch.findOne();

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Check if payroll draft for month already exists
    const existing = await PayrollRun.findOne({ organizationId: org._id, month });
    if (existing) {
      return NextResponse.json(
        { success: true, message: `Payroll draft for ${month} already exists.`, payroll: existing },
        { status: 200 }
      );
    }

    const users = await User.find({ role: { $ne: "super_admin" } });
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

    const payroll = await PayrollRun.create({
      organizationId: org._id,
      branchId: branch._id,
      month,
      entries,
      totalPayroll,
      status: "draft",
    });

    return NextResponse.json(
      { success: true, message: `Monthly payroll draft generated for ${month}!`, payroll },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate payroll" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { payrollId, status, approvedBy = "Store Owner" } = body;

    if (!payrollId || !status) {
      return NextResponse.json({ error: "payrollId and status are required" }, { status: 400 });
    }

    const payroll = await PayrollRun.findById(payrollId);
    if (!payroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    if (status === "paid") {
      payroll.status = "paid";
      payroll.approvedBy = approvedBy;
      payroll.paidAt = new Date();
      await payroll.save();

      // Post Salary Expense Journal Entry to Ledger
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
            debit: payroll.totalPayroll,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: "Bank Main Account",
            debit: 0,
            credit: payroll.totalPayroll,
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
      { error: error.message || "Failed to update payroll" },
      { status: 500 }
    );
  }
}
