import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Announcement } from "@/models/Announcement";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("manage_support");
    if (!auth.authorized) return auth.response;

    await dbConnect();
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      announcements: announcements.map((a: any) => ({
        id: a._id.toString(),
        title: a.title,
        content: a.content,
        type: a.type,
        targetVerticals: a.targetVerticals,
        isActive: a.isActive,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch announcements" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdminAction("manage_support");
    if (!auth.authorized) return auth.response;

    await dbConnect();
    const body = await req.json();
    const { title, content, type = "info", targetVerticals = ["all"], expiresAt } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const announcement = await Announcement.create({
      title,
      content,
      type,
      targetVerticals: Array.isArray(targetVerticals) ? targetVerticals : [targetVerticals],
      isActive: true,
      createdBy: auth.session!.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({
      success: true,
      announcement: {
        id: announcement._id.toString(),
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        targetVerticals: announcement.targetVerticals,
        isActive: announcement.isActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create announcement" : error.message },
      { status: 500 }
    );
  }
}
