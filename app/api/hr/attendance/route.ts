import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
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

    const body = await req.json();
    const { action, pin, userName, notes } = body;

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    let userObj = null;
    let nameToUse = session.fullName || userName || "Staff Member";
    let roleToUse = session.role || "cashier";

    // If PIN provided, verify against bcrypt hashed PINs for this tenant
    if (pin) {
      const tenantUsers = await User.find({ organizationId: org._id, isActive: true }).select("+pin");
      for (const u of tenantUsers) {
        if (await u.comparePin(pin)) {
          userObj = u;
          break;
        }
      }

      if (!userObj) {
        return NextResponse.json({ error: "Invalid staff PIN" }, { status: 400 });
      }
      nameToUse = userObj.fullName;
      roleToUse = userObj.role;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (action === "clock_in") {
      const existing = await Attendance.findOne({
        branchId: branch._id,
        userName: nameToUse,
        clockOut: { $exists: false },
        date: { $gte: todayStart },
      });

      if (existing) {
        return NextResponse.json(
          { error: `${nameToUse} is already clocked in today at ${new Date(existing.clockIn).toLocaleTimeString()}` },
          { status: 400 }
        );
      }

      const log = await Attendance.create({
        organizationId: org._id,
        branchId: branch._id,
        userId: userObj ? userObj._id : undefined,
        userName: nameToUse,
        userRole: roleToUse,
        clockIn: new Date(),
        status: "present",
        date: new Date(),
        notes,
      });

      return NextResponse.json(
        { success: true, message: `${nameToUse} clocked IN successfully!`, log },
        { status: 201 }
      );
    }

    if (action === "clock_out") {
      const activeLog = await Attendance.findOne({
        branchId: branch._id,
        userName: nameToUse,
        clockOut: { $exists: false },
      }).sort({ clockIn: -1 });

      if (!activeLog) {
        return NextResponse.json(
          { error: `No active clock-in session found for ${nameToUse}` },
          { status: 400 }
        );
      }

      const clockOutTime = new Date();
      const diffMs = clockOutTime.getTime() - new Date(activeLog.clockIn).getTime();
      const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

      activeLog.clockOut = clockOutTime;
      activeLog.totalHours = hoursWorked;
      activeLog.notes = notes || activeLog.notes;
      await activeLog.save();

      return NextResponse.json({
        success: true,
        message: `${nameToUse} clocked OUT (${hoursWorked} hrs worked)`,
        log: activeLog,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'clock_in' or 'clock_out'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to record attendance" : error.message },
      { status: 500 }
    );
  }
}
