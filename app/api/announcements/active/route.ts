import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Announcement } from "@/models/Announcement";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();

    const userVertical = session.businessType || "all";

    const announcements = await Announcement.find({
      $and: [
        { isActive: true },
        {
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
        },
        {
          $or: [{ targetVerticals: "all" }, { targetVerticals: userVertical }],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      announcements: announcements.map((a: any) => ({
        id: a._id.toString(),
        title: a.title,
        content: a.content,
        type: a.type,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to load active announcements" : error.message },
      { status: 500 }
    );
  }
}
