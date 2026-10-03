"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isPlatformRole } from "@/lib/auth/permissions";
import { useSessionUser } from "@/components/layout/SessionContext";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

interface Transaction {
  id: string;
  orderNumber: string;
  type: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const userSession = useSessionUser();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    totalOrders: 0,
    lowStockCount: 0,
    openingFloat: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  // null until loaded; then the open shift's float, or false when no shift is open
  const [shift, setShift] = useState<{ openingFloat: number } | false | null>(null);

  const isPlatformStaff = isPlatformRole(userSession?.role) && !userSession?.isImpersonating;

  useEffect(() => {
    // Super Admin on the store dashboard goes to the Tenant Command Center
    if (isPlatformStaff) {
      router.replace("/super-admin");
      return;
    }

    async function loadDashboardData() {
      // The three calls are independent, so they go out together instead of one after another
      const getJson = (url: string) =>
        fetch(url)
          .then((r) => r.json())
          .catch(() => null);

      try {
        // "Today" starts at local midnight; the report defaults to 30 days otherwise
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [summaryData, ordersData, prodData, shiftData] = await Promise.all([
          getJson(`/api/reports/sales-summary?startDate=${encodeURIComponent(todayStart.toISOString())}`),
          getJson("/api/orders?limit=5"),
          getJson("/api/products?lowStockBelow=10"),
          getJson("/api/counter-session"),
        ]);

        if (shiftData?.success) {
          setShift(shiftData.activeSession ? { openingFloat: shiftData.activeSession.openingFloat || 0 } : false);
        }

        if (summaryData?.success && summaryData.summary) {
          setStats((prev) => ({
            ...prev,
            todayRevenue: summaryData.summary.netRevenue ?? summaryData.summary.totalRevenue ?? 0,
            totalOrders: summaryData.summary.totalOrders || 0,
          }));
        }

        if (ordersData?.success && Array.isArray(ordersData.orders)) {
          setRecentTransactions(
            ordersData.orders.slice(0, 5).map((o: any) => ({
              id: o._id,
              orderNumber: o.orderNumber,
              type: o.orderType ? o.orderType.replace("_", " ").toUpperCase() : "SALE",
              customer: o.customerName || "Walk-in Guest",
              amount: o.grandTotal || 0,
              status: o.status || "completed",
              time: new Date(o.createdAt).toLocaleTimeString("en-PK", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))
          );
        }

        if (prodData?.success && typeof prodData.lowStockCount === "number") {
          setStats((prev) => ({ ...prev, lowStockCount: prodData.lowStockCount }));
        }
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isPlatformStaff, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-accent">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span>Loading Store Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageActions>
        <Link href="/pos" className="btn btn-primary py-2.5 px-5 text-[1.3rem]">
          <Plus className="w-5 h-5" />
          <span>Launch POS Terminal</span>
        </Link>
      </PageActions>

      <p className="text-[1.6rem] text-medium -mb-2">
        Welcome back, <b className="text-bright">{userSession?.fullName || "Store Manager"}</b>
      </p>

      {/* Industrial Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Revenue */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Today's Revenue</span>
            <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">PKR {stats.todayRevenue.toLocaleString()}</div>
          <div className="flex items-center gap-2 font-accent text-[1.2rem] text-success">
            <TrendingUp className="w-4 h-4" />
            <span>Live Sales Aggregate</span>
          </div>
        </div>

        {/* Stat 2: Total Orders */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Orders Today</span>
            <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">{stats.totalOrders}</div>
          <div className="flex items-center gap-2 font-accent text-[1.2rem] text-success">
            <ArrowUpRight className="w-4 h-4" />
            <span>Completed Shift Orders</span>
          </div>
        </div>

        {/* Stat 3: Low Stock */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Low Stock Items</span>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value text-amber-500">{stats.lowStockCount}</div>
          <div className="font-accent text-[1.2rem] text-muted">
            {stats.lowStockCount > 0 ? "Requires stock reorder" : "Inventory levels healthy"}
          </div>
        </div>

        {/* Stat 4: Shift Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Counter Shift</span>
            <div
              className={`w-10 h-10 flex items-center justify-center ${
                shift ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className={`stat-card__value text-[1.8rem] ${shift ? "text-emerald-600" : "text-rose-600"}`}>
            {shift === null ? "—" : shift ? "Shift Open" : "Shift Closed"}
          </div>
          <div className="font-accent text-[1.2rem] text-muted">
            {shift ? `Opening float PKR ${shift.openingFloat.toLocaleString()}` : "Open a shift from POS Billing to start selling"}
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-base-tint border border-stroke-muted p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stroke-muted pb-4">
          <div className="flex items-center gap-2 font-accent text-[1.4rem] font-bold text-bright uppercase">
            <Clock className="w-5 h-5 text-accent" />
            <span>Recent Store Orders</span>
          </div>
          <Link href="/orders" className="text-[1.2rem] font-accent text-accent hover:underline">
            View All Orders →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted font-accent text-[1.3rem] space-y-2">
            <div>No orders recorded yet for this tenant store.</div>
            <div className="text-[1.1rem]">Click "Launch POS Terminal" above to create your first bill!</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="pos-table w-full text-left">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Order Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-bold text-accent whitespace-nowrap">{tx.orderNumber}</td>
                    <td className="whitespace-nowrap">{tx.customer}</td>
                    <td className="uppercase text-[1.2rem] font-accent whitespace-nowrap">{tx.type}</td>
                    <td className="font-bold text-emerald-600 whitespace-nowrap">PKR {tx.amount.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-success uppercase">{tx.status}</span>
                    </td>
                    <td className="text-muted font-accent text-[1.2rem] whitespace-nowrap">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
