"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";

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
  const { currentVertical, selectedBranch } = usePosStore();
  const config = VERTICAL_CONFIGS[currentVertical];

  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any | null>(null);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    totalOrders: 0,
    lowStockCount: 0,
    openingFloat: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Fetch Auth Session
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (authData.authenticated && authData.user) {
          setUserSession(authData.user);

          // If Super Admin accesses main dashboard, redirect to Tenant Command Center
          if (authData.user.role === "super_admin") {
            router.replace("/super-admin");
            return;
          }
        }

        // 2. Fetch Live Sales Summary
        const summaryRes = await fetch("/api/reports/sales-summary");
        const summaryData = await summaryRes.json();

        if (summaryData.success && summaryData.summary) {
          setStats((prev) => ({
            ...prev,
            todayRevenue: summaryData.summary.totalRevenue || 0,
            totalOrders: summaryData.summary.totalOrders || 0,
          }));
        }

        // 3. Fetch Live Orders
        const ordersRes = await fetch("/api/orders");
        const ordersData = await ordersRes.json();

        if (ordersData.success && Array.isArray(ordersData.orders)) {
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

        // 4. Fetch Products to calculate low stock count
        const prodRes = await fetch("/api/products");
        const prodData = await prodRes.json();

        if (prodData.success && Array.isArray(prodData.products)) {
          const lowStock = prodData.products.filter((p: any) => (p.stock || 0) < 10).length;
          setStats((prev) => ({ ...prev, lowStockCount: lowStock }));
        }
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="badge badge-accent">ACTIVE ENGINE</span>
            <span className="font-accent font-bold text-accent uppercase text-[1.4rem]">
              {config.title}
            </span>
          </div>
          <h2 className="text-[2.4rem] font-extrabold text-bright mt-2">
            Welcome back, {userSession?.fullName || "Store Manager"}
          </h2>
          <p className="text-medium text-[1.4rem]">
            {userSession?.branchName || selectedBranch || "Main Branch"} — Real-time performance overview & POS operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pos" className="btn btn-primary py-3 px-6 text-[1.4rem]">
            <Plus className="w-5 h-5" />
            <span>Launch POS Terminal</span>
          </Link>
        </div>
      </div>

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
            <span className="stat-card__label">Total Orders</span>
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
            <span className="stat-card__label">Active Shift Status</span>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value text-emerald-400 text-[1.8rem]">Terminal Ready</div>
          <div className="font-accent text-[1.2rem] text-muted">
            Shift Ready for Billing
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
                    <td className="font-bold text-accent">{tx.orderNumber}</td>
                    <td>{tx.customer}</td>
                    <td className="uppercase text-[1.2rem] font-accent">{tx.type}</td>
                    <td className="font-bold text-emerald-400">PKR {tx.amount.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-success uppercase">{tx.status}</span>
                    </td>
                    <td className="text-muted font-accent text-[1.2rem]">{tx.time}</td>
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
