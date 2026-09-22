import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { PaymentHistory } from "@/models/PaymentHistory";
import { Organization } from "@/models/Organization";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const payment = await PaymentHistory.findById(id).lean();
    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const isPlatformStaff = session.role === "super_admin" || session.role === "platform_support";
    if (!isPlatformStaff && payment.organizationId.toString() !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden: You can only view invoices for your own organization" }, { status: 403 });
    }

    const org = await Organization.findById(payment.organizationId).lean();

    const invoiceNumber = `INV-${payment._id.toString().slice(-6).toUpperCase()}`;
    const paidDateStr = new Date(payment.paidAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const expiresDateStr = new Date(payment.expiresAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Subscription Invoice ${invoiceNumber} - RST POS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; margin: 0; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
    .logo span { color: #3b82f6; }
    .badge { background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .meta-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    .meta-value { font-size: 15px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { background: #f1f5f9; text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .total-row { font-size: 18px; font-weight: 800; color: #1e3a8a; }
    .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 13px; color: #64748b; }
    .print-btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-bottom: 24px; cursor: pointer; border: none; }
    @media print { .no-print { display: none !important; } body { padding: 0; background: #fff; } .invoice-card { box-shadow: none; border: none; padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 800px; margin: 0 auto;" class="no-print">
    <button onclick="window.print()" class="print-btn">🖨️ Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="logo">RST <span>POS</span> PLATFORM</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Software as a Service (SaaS) Platform HQ</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800; color: #0f172a;">OFFICIAL INVOICE</div>
        <div style="font-size: 14px; color: #64748b; margin-top: 4px;"># ${invoiceNumber}</div>
        <div style="margin-top: 8px;"><span class="badge">PAID IN FULL</span></div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="meta-title">Billed To (Tenant Business)</div>
        <div class="meta-value" style="font-size: 18px; color: #1e3a8a;">${payment.tenantName}</div>
        <div style="font-size: 14px; color: #475569; margin-top: 4px;">Business Type: ${org?.businessType ? org.businessType.toUpperCase() : "POS"}</div>
        <div style="font-size: 14px; color: #475569;">Email: ${org?.email || "N/A"}</div>
        <div style="font-size: 14px; color: #475569;">Phone: ${org?.phone || "N/A"}</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-title">Invoice Details</div>
        <div style="font-size: 14px; color: #475569; margin-bottom: 4px;"><strong>Payment Date:</strong> ${paidDateStr}</div>
        <div style="font-size: 14px; color: #475569; margin-bottom: 4px;"><strong>Access Period:</strong> ${payment.monthsAdded} Month(s)</div>
        <div style="font-size: 14px; color: #475569; margin-bottom: 4px;"><strong>Subscription Expiry:</strong> ${expiresDateStr}</div>
        <div style="font-size: 14px; color: #475569;"><strong>Payment Method:</strong> ${payment.paymentMethod.toUpperCase()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Plan Tier</th>
          <th>Billing Cycle</th>
          <th style="text-align: right;">Amount (${payment.currency || "PKR"})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>RST POS Subscription Fee</strong><br/>
            <span style="font-size: 13px; color: #64748b;">Includes full POS access, multi-branch, inventory, HR & accounting engine</span>
          </td>
          <td>${payment.planTier === "billing_accounting" ? "Billing + Accounting Pro" : "Standard Billing"}</td>
          <td>${payment.billingCycle} (${payment.monthsAdded} mo)</td>
          <td style="text-align: right; font-weight: 700;">${payment.amount.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">Total Amount Paid:</td>
          <td style="text-align: right;">${payment.currency || "PKR"} ${payment.amount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    ${payment.notes ? `<div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 32px; font-size: 14px; color: #475569;"><strong>Notes / Reference:</strong> ${payment.notes}</div>` : ""}

    <div class="footer">
      <p>Thank you for choosing <strong>RST POS System</strong> for your business operations!</p>
      <p style="font-size: 12px; color: #94a3b8;">Generated by RST POS Platform Command Center · For support inquiries, contact support@rstpos.com</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to render invoice" : error.message },
      { status: 500 }
    );
  }
}
