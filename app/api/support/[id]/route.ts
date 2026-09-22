import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { SupportTicket } from "@/models/SupportTicket";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const ticket = await SupportTicket.findById(id).lean();
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const isPlatformStaff = session.role === "super_admin" || session.role === "platform_support";
    if (!isPlatformStaff && ticket.organizationId.toString() !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        tenantName: ticket.tenantName,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        creatorName: ticket.creatorName,
        creatorEmail: ticket.creatorEmail,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        messages: ticket.messages || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to load ticket detail" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const body = await req.json();
    const { content, status } = body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const isPlatformStaff = session.role === "super_admin" || session.role === "platform_support";
    if (!isPlatformStaff && ticket.organizationId.toString() !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (content && content.trim()) {
      ticket.messages.push({
        senderRole: session.role,
        senderName: session.name || "User",
        senderId: new mongoose.Types.ObjectId(session.userId) as any,
        content,
        createdAt: new Date(),
      });
    }

    if (status && ["open", "in_progress", "resolved", "closed"].includes(status)) {
      ticket.status = status;
    } else if (isPlatformStaff && ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    return NextResponse.json({
      success: true,
      message: "Ticket response added successfully",
      ticket: {
        id: ticket._id.toString(),
        status: ticket.status,
        messages: ticket.messages,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to reply to ticket" : error.message },
      { status: 500 }
    );
  }
}
