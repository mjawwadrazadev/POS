import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { JournalEntry } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const branchId = searchParams.get("branchId");

    // Default to last 30 days if no range provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const matchQuery: any = {
      organizationId: session.organizationId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    };

    if (branchId) {
      matchQuery.branchId = branchId;
    }

    // Aggregation pipeline for totals
    const salesStats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSubtotal: { $sum: "$subtotal" },
          totalTax: { $sum: "$taxAmount" },
          totalDiscounts: { $sum: "$discountTotal" },
          totalRevenue: { $sum: "$grandTotal" },
        },
      },
    ]);

    // Monthly breakdown pipeline (for previous month / previous year analysis)
    const monthlyBreakdown = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          ordersCount: { $sum: 1 },
          monthlyRevenue: { $sum: "$grandTotal" },
          monthlyTax: { $sum: "$taxAmount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // Order Types breakdown (Bakery, Restaurant Dine-in, Takeaway, Prescription, Retail)
    const typeBreakdown = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$orderType",
          count: { $sum: 1 },
          revenue: { $sum: "$grandTotal" },
        },
      },
    ]);

    const resultStats = salesStats[0] || {
      totalOrders: 0,
      totalSubtotal: 0,
      totalTax: 0,
      totalDiscounts: 0,
      totalRevenue: 0,
    };

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: resultStats,
      monthlyBreakdown,
      typeBreakdown,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to generate sales report" : error.message },
      { status: 500 }
    );
  }
}
