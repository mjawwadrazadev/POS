"use client";

import Link from "next/link";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  Layers,
  ArrowUpRight,
  Package,
  Plus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Users,
  Utensils,
  Pill,
  BarChart3,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { currentVertical, selectedBranch, shiftCashier } = usePosStore();
  const config = VERTICAL_CONFIGS[currentVertical];

  const recentTransactions = [
    {
      id: "ORD-99812",
      type: "Prescription Sale",
      customer: "Tariq Mahmood",
      itemsCount: 4,
      amount: "PKR 3,450",
      status: "completed",
      time: "10:42 AM",
    },
    {
      id: "ORD-99811",
      type: "Table 04 (Dine-in)",
      customer: "Walk-in Guest",
      itemsCount: 6,
      amount: "PKR 8,920",
      status: "completed",
      time: "10:28 AM",
    },
    {
      id: "ORD-99810",
      type: "Retail Sale",
      customer: "Usman Raza",
      itemsCount: 2,
      amount: "PKR 1,200",
      status: "held",
      time: "09:55 AM",
    },
    {
      id: "ORD-99809",
      type: "Device Sale (IMEI)",
      customer: "Bilal Hassan",
      itemsCount: 1,
      amount: "PKR 45,000",
      status: "completed",
      time: "09:14 AM",
    },
  ];

  // Visual 7-Day Revenue Trend Data
  const revenueTrend = [
    { day: "Mon", amount: 124000, height: "60%" },
    { day: "Tue", amount: 145000, height: "70%" },
    { day: "Wed", amount: 132000, height: "64%" },
    { day: "Thu", amount: 168000, height: "82%" },
    { day: "Fri", amount: 195000, height: "95%" },
    { day: "Sat", amount: 210000, height: "100%" },
    { day: "Sun", amount: 184570, height: "90%" },
  ];

  // Top Selling Items Data
  const topProducts = [
    { name: "Special Cream Fudge Cake (2lb)", sales: 48, percentage: 85, category: "Cakes" },
    { name: "Double Shot Espresso", sales: 42, percentage: 74, category: "Beverages" },
    { name: "Panadol Extra 500mg Strip", sales: 36, percentage: 62, category: "Medicines" },
    { name: "Special Chicken Karahi (1KG)", sales: 29, percentage: 51, category: "Main Course" },
  ];

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
            Welcome back, {shiftCashier}
          </h2>
          <p className="text-medium text-[1.4rem]">
            {selectedBranch} — Real-time performance overview & POS operations.
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
        {/* Stat 1 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Today's Revenue</span>
            <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">PKR 184,570</div>
          <div className="flex items-center gap-2 font-accent text-[1.2rem] text-success">
            <TrendingUp className="w-4 h-4" />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Total Orders</span>
            <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">148</div>
          <div className="flex items-center gap-2 font-accent text-[1.2rem] text-success">
            <ArrowUpRight className="w-4 h-4" />
            <span>Avg 2.8 sec checkout</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Low Stock Items</span>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value text-amber-500">12</div>
          <div className="font-accent text-[1.2rem] text-muted">
            Requires stock reorder
          </div>
        </div>

        {/* Stat 4 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Shift Cash Float</span>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">PKR 25,000</div>
          <div className="font-accent text-[1.2rem] text-muted">
            Opening Float Verified
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: 7-Day Revenue Trend + Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-base-tint border border-stroke-muted p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-accent text-[1.4rem] font-bold text-bright uppercase">
              <BarChart3 className="w-5 h-5 text-accent" />
              <span>7-Day Sales Trend & Performance</span>
            </div>
            <span className="text-[1.2rem] font-accent text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1">
              Peak: Sat (PKR 210,000)
            </span>
          </div>

          <div className="h-52 pt-6 pb-2 flex items-end justify-between gap-3 border-b border-stroke-muted px-2">
            {revenueTrend.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[1.1rem] font-accent font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  {(item.amount / 1000).toFixed(0)}k
                </div>
                <div
                  style={{ height: item.height }}
                  className="w-full bg-gradient-to-t from-[#002bba] to-blue-400 hover:to-blue-300 transition-all border-t-2 border-blue-300"
                />
                <span className="font-accent text-[1.2rem] text-muted font-bold uppercase">
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[1.2rem] font-accent text-muted pt-1">
            <span>Weekly Sales Aggregate: PKR 1,173,570</span>
            <span className="text-accent font-bold">100% Tenant Scoped</span>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-base-tint border border-stroke-muted p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-accent text-[1.4rem] font-bold text-bright uppercase">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Top Sellers Today</span>
            </div>
            <Link href="/products" className="text-accent font-accent text-[1.2rem] hover:underline">
              All SKUs →
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            {topProducts.map((prod, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-[1.3rem] font-accent">
                  <span className="font-bold text-bright truncate max-w-[18rem]">{prod.name}</span>
                  <span className="text-accent font-bold">{prod.sales} sold</span>
                </div>
                <div className="w-full bg-base-bright h-2 border border-stroke-muted overflow-hidden">
                  <div
                    style={{ width: `${prod.percentage}%` }}
                    className="bg-[#002bba] h-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contextual Vertical Dashboard Widgets */}
      {(currentVertical === "restaurant" || currentVertical === "cafe") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-tint border border-emerald-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-emerald-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>Live Table Occupancy</span>
              <Utensils className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-bright">8 / 12 Occupied</div>
            <p className="text-[1.2rem] font-accent text-medium">
              4 Tables Available (66% Hall Capacity)
            </p>
          </div>

          <div className="bg-base-tint border border-blue-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-blue-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>KDS Kitchen Queue</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-bright">5 Active Tickets</div>
            <p className="text-[1.2rem] font-accent text-medium">
              Avg Prep Time: 14 mins (Queued: 2, Prep: 3)
            </p>
          </div>

          <div className="bg-base-tint border border-purple-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-purple-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>Floor Staff Attendance</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-bright">6 On Duty</div>
            <p className="text-[1.2rem] font-accent text-medium">
              3 Waiters, 2 Chefs, 1 Manager Clocked-In
            </p>
          </div>
        </div>
      )}

      {(currentVertical === "pharmacy" || currentVertical === "bakery" || currentVertical === "supermarket") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-tint border border-rose-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-rose-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>Near-Expiry Alert (FEFO)</span>
              <Pill className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-rose-400">4 Batches</div>
            <p className="text-[1.2rem] font-accent text-medium">
              Expiring within 30 days — FEFO priority active
            </p>
          </div>

          <div className="bg-base-tint border border-amber-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-amber-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>Reorder Warning</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-amber-400">12 SKUs Low</div>
            <p className="text-[1.2rem] font-accent text-medium">
              Below safety stock threshold
            </p>
          </div>

          <div className="bg-base-tint border border-emerald-500/30 p-5 space-y-3">
            <div className="flex justify-between items-center text-emerald-400 font-accent font-bold text-[1.3rem] uppercase">
              <span>Perishable Freshness</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-[2.2rem] font-extrabold text-bright">100% Inspected</div>
            <p className="text-[1.2rem] font-accent text-medium">
              No expired stock present on sales floor
            </p>
          </div>
        </div>
      )}

      {/* Active Vertical Capabilities Panel */}
      <div className="bg-base-tint border border-stroke-muted p-6">
        <h3 className="font-accent text-[1.4rem] font-bold text-medium uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <span>Active Capability Flags for {config.title}</span>
        </h3>
        <div className="flex flex-wrap gap-3">
          {config.enabledModules.map((moduleKey) => (
            <div
              key={moduleKey}
              className="bg-base-bright border border-stroke-muted px-4 py-2 flex items-center gap-2 font-accent text-[1.2rem] text-bright"
            >
              <span className="w-2 h-2 bg-emerald-400 inline-block" />
              <span className="uppercase font-semibold">{moduleKey}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions Data Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
            Recent Terminal Transactions
          </h3>
          <Link href="/orders" className="text-accent font-accent text-[1.2rem] hover:underline uppercase">
            View All Orders →
          </Link>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Type</th>
                <th>{config.terminology.customer || "Customer"}</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-accent font-bold text-accent">{tx.id}</td>
                  <td className="font-medium">{tx.type}</td>
                  <td>{tx.customer}</td>
                  <td className="font-accent">{tx.itemsCount} items</td>
                  <td className="font-accent font-bold text-bright">{tx.amount}</td>
                  <td className="font-accent text-muted">{tx.time}</td>
                  <td>
                    {tx.status === "completed" ? (
                      <span className="badge badge-success">COMPLETED</span>
                    ) : (
                      <span className="badge badge-warning">HELD</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-secondary py-1 px-3 text-[1.1rem]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
