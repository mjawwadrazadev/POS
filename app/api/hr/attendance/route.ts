import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const attendanceLogs = await Attendance.find().sort({ clockIn: -1 }).limit(50);
    return NextResponse.json({ success: true, count: attendanceLogs.length, attendanceLogs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, pin, userName = "Staff Member", notes } = body;

    let org = await Organization.findOne();
    let branch = await Branch.findOne();

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    let userObj = null;
    let nameToUse = userName;
    let roleToUse = "cashier";

    if (pin) {
      userObj = await User.findOne({ pin }).select("+pin");
      if (!userObj) {
        return NextResponse.json({ error: "Invalid staff PIN" }, { status: 400 });
      }
      nameToUse = userObj.fullName;
      roleToUse = userObj.role;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (action === "clock_in") {
      // Check if active record for today already exists
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
        date: new Date(),
        clockIn: new Date(),
        status: "present",
        notes,
      });

      return NextResponse.json(
        { success: true, message: `Clocked IN successfully! Welcome, ${nameToUse}`, log },
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
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal place

      activeLog.clockOut = clockOutTime;
      activeLog.totalHours = totalHours;
      activeLog.notes = notes || activeLog.notes;
      await activeLog.save();

      return NextResponse.json({
        success: true,
        message: `Clocked OUT successfully! Shift duration: ${totalHours} hrs`,
        log: activeLog,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process attendance" },
      { status: 500 }
    );
  }
}
