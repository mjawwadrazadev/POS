import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Attendance } from "@/models/Attendance";
import { User, IUser } from "@/models/User";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/security/rateLimiter";
import { isValidPin } from "@/lib/utils/server";

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attendanceLogs = await Attendance.find({ organizationId: session.organizationId })
      .sort({ clockIn: -1 })
      .limit(50);
    return NextResponse.json({ success: true, count: attendanceLogs.length, attendanceLogs });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch attendance logs" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, pin, notes } = await req.json();
    if (action !== "clock_in" && action !== "clock_out") {
      return NextResponse.json({ error: "Invalid action. Use 'clock_in' or 'clock_out'" }, { status: 400 });
    }

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found" }, { status: 400 });

    // Staff clock in on a shared terminal with their own PIN; without a PIN it is the logged-in user
    let staff: IUser | null = null;
    if (pin) {
      if (!isValidPin(String(pin))) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });

      const rateKey = `attendance_pin:${session.organizationId}:${session.userId}`;
      const rate = await checkRateLimit(rateKey, 10, 15 * 60 * 1000);
      if (!rate.success) return NextResponse.json({ error: "Too many invalid PIN attempts. Try again later." }, { status: 429 });

      const tenantUsers = await User.find({ organizationId: session.organizationId, isActive: true }).select("+pin");
      for (const u of tenantUsers) {
        if (await u.comparePin(String(pin))) {
          staff = u;
          break;
        }
      }
      if (!staff) {
        await recordFailedAttempt(rateKey, 15 * 60 * 1000);
        return NextResponse.json({ error: "Invalid staff PIN" }, { status: 400 });
      }
      await clearRateLimit(rateKey);
    } else {
      staff = await User.findOne({ _id: session.userId, organizationId: session.organizationId });
      if (!staff) return NextResponse.json({ error: "Staff account not found" }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (action === "clock_in") {
      const existing = await Attendance.findOne({
        organizationId: session.organizationId,
        userId: staff._id,
        clockOut: { $exists: false },
        date: { $gte: todayStart },
      });
      if (existing) {
        return NextResponse.json(
          { error: `${staff.fullName} is already clocked in today at ${new Date(existing.clockIn).toLocaleTimeString()}` },
          { status: 400 }
        );
      }

      const log = await Attendance.create({
        organizationId: session.organizationId,
        branchId: branch._id,
        userId: staff._id,
        userName: staff.fullName,
        userRole: staff.role,
        clockIn: new Date(),
        status: "present",
        date: new Date(),
        notes,
      });
      return NextResponse.json({ success: true, message: `${staff.fullName} clocked IN successfully!`, log }, { status: 201 });
    }

    const activeLog = await Attendance.findOne({
      organizationId: session.organizationId,
      userId: staff._id,
      clockOut: { $exists: false },
    }).sort({ clockIn: -1 });

    if (!activeLog) {
      return NextResponse.json({ error: `No active clock-in session found for ${staff.fullName}` }, { status: 400 });
    }

    const clockOutTime = new Date();
    const hoursWorked = Math.round(((clockOutTime.getTime() - new Date(activeLog.clockIn).getTime()) / 3600000) * 10) / 10;

    activeLog.clockOut = clockOutTime;
    activeLog.totalHours = hoursWorked;
    activeLog.notes = notes || activeLog.notes;
    await activeLog.save();

    return NextResponse.json({ success: true, message: `${staff.fullName} clocked OUT (${hoursWorked} hrs worked)`, log: activeLog });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to record attendance" : error.message },
      { status: 500 }
    );
  }
}
