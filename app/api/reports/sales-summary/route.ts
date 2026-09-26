import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Refund } from "@/models/Refund";
import mongoose from "mongoose";
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
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    // A bare YYYY-MM-DD end date should include that whole day
    if (endDateParam && /^\d{4}-\d{2}-\d{2}$/.test(endDateParam)) endDate.setHours(23, 59, 59, 999);

    // Aggregation pipelines do not cast strings, so ids must be ObjectIds here
    const orgObjectId = new mongoose.Types.ObjectId(session.organizationId);
    const matchQuery: any = {
      organizationId: orgObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
      // Refunded sales still happened; refunds are subtracted separately below
      status: { $in: ["completed", "partially_refunded", "refunded"] },
    };

    if (branchId) {
      if (!mongoose.isValidObjectId(branchId)) return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      matchQuery.branchId = new mongoose.Types.ObjectId(branchId);
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

    // Cost of goods sold from the per-item cost snapshot
    const cogsExpr = {
      $sum: {
        $map: {
          input: "$items",
          in: { $multiply: [{ $ifNull: ["$$this.unitCost", 0] }, "$$this.quantity"] },
        },
      },
    };
    const cogsStats = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalCogs: { $sum: cogsExpr } } },
    ]);

    // Monthly breakdown pipeline (for previous month / previous year analysis)
    const monthlyBreakdown = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          monthlyCogs: { $sum: cogsExpr },
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

    const refundMatch: any = {
      organizationId: orgObjectId,
      status: "completed",
      updatedAt: { $gte: startDate, $lte: endDate },
    };
    if (matchQuery.branchId) refundMatch.branchId = matchQuery.branchId;
    const refundStats = await Refund.aggregate([
      { $match: refundMatch },
      { $group: { _id: null, totalRefunds: { $sum: "$totalRefundAmount" }, refundTax: { $sum: "$taxAmount" }, count: { $sum: 1 } } },
    ]);

    const base = salesStats[0] || {
      totalOrders: 0,
      totalSubtotal: 0,
      totalTax: 0,
      totalDiscounts: 0,
      totalRevenue: 0,
    };
    const totalRefunds = refundStats[0]?.totalRefunds || 0;
    const resultStats = {
      ...base,
      totalRefunds,
      refundCount: refundStats[0]?.count || 0,
      netRevenue: base.totalRevenue - totalRefunds,
      netTax: base.totalTax - (refundStats[0]?.refundTax || 0),
      totalCogs: cogsStats[0]?.totalCogs || 0,
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
