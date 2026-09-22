import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { SupportTicket } from "@/models/SupportTicket";
import { Organization } from "@/models/Organization";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const isPlatformStaff = session.role === "super_admin" || session.role === "platform_support";

    let tickets;
    if (isPlatformStaff) {
      // Super admin sees all platform tickets
      tickets = await SupportTicket.find({}).sort({ updatedAt: -1 }).lean();
    } else {
      // Tenant user sees tickets for their organization
      tickets = await SupportTicket.find({ organizationId: session.organizationId })
        .sort({ updatedAt: -1 })
        .lean();
    }

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({
        id: t._id.toString(),
        ticketNumber: t.ticketNumber,
        tenantName: t.tenantName,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        creatorName: t.creatorName,
        creatorEmail: t.creatorEmail,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        messageCount: t.messages?.length || 0,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch support tickets" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { subject, category = "general", priority = "medium", message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const org = await Organization.findById(session.organizationId);

    const ticketNumber = `TICK-${Date.now().toString().slice(-6)}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      organizationId: session.organizationId,
      tenantName: org?.name || session.orgName || "Unknown Business",
      creatorId: session.userId,
      creatorName: session.name || "Tenant User",
      creatorEmail: session.email || "admin@tenant.com",
      subject,
      category,
      priority,
      status: "open",
      messages: [
        {
          senderRole: session.role,
          senderName: session.name || "Tenant User",
          senderId: session.userId,
          content: message,
          createdAt: new Date(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create support ticket" : error.message },
      { status: 500 }
    );
  }
}
