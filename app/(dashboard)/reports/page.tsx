"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Building2,
  Filter,
  Layers,
  ArrowUpRight,
  PieChart,
} from "lucide-react";

export default function ReportsPage() {
  const { currentVertical, selectedBranch } = usePosStore();
  const config = VERTICAL_CONFIGS[currentVertical];

  const [datePreset, setDatePreset] = useState<"today" | "7days" | "30days" | "last_month" | "last_year">("30days");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-09-19");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [datePreset, startDate, endDate]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch {
      // Fallback sample data if DB is offline
    } finally {
      setLoading(false);
    }
  }

  // Pre-configured historical months sample comparison
  const monthlyHistory = [
    { month: "September 2026 (Current)", orders: 148, revenue: "PKR 184,570", tax: "PKR 29,531", profit: "PKR 54,200", growth: "+14.2%" },
    { month: "August 2026 (Last Month)", orders: 420, revenue: "PKR 512,000", tax: "PKR 81,920", profit: "PKR 148,000", growth: "+11.5%" },
    { month: "July 2026", orders: 390, revenue: "PKR 468,000", tax: "PKR 74,880", profit: "PKR 132,000", growth: "+8.9%" },
    { month: "June 2026", orders: 365, revenue: "PKR 430,000", tax: "PKR 68,800", profit: "PKR 119,000", growth: "+5.4%" },
    { month: "May 2026", orders: 340, revenue: "PKR 395,000", tax: "PKR 63,200", profit: "PKR 108,000", growth: "+12.1%" },
    { month: "Year 2025 (Annual Total)", orders: 4120, revenue: "PKR 4,890,000", tax: "PKR 782,400", profit: "PKR 1,350,000", growth: "+24.5%" },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Historical Financial & Sales Reports ("Hisab Kitab")
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Compare monthly & yearly revenue, profit margins, tax liability across Bakery, Restaurant, Cafe & all verticals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => window.print()} className="btn btn-secondary py-3 px-4 text-[1.2rem]">
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button type="button" className="btn btn-primary py-3 px-5 text-[1.3rem]">
            <Download className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Preset Tabs */}
        <div className="flex flex-wrap items-center gap-2 font-accent text-[1.2rem]">
          <span className="text-muted flex items-center gap-1 font-semibold mr-1">
            <Calendar className="w-4 h-4 text-accent" />
            Period:
          </span>
          {[
            { id: "today", label: "Today" },
            { id: "7days", label: "Last 7 Days" },
            { id: "30days", label: "Last 30 Days" },
            { id: "last_month", label: "Previous Month" },
            { id: "last_year", label: "Previous Year (2025)" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id as any)}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                datePreset === preset.id
                  ? "bg-accent text-white"
                  : "bg-base-bright border border-stroke-muted text-bright hover:bg-accent-subtle"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        <div className="flex items-center gap-3 font-accent text-[1.2rem]">
          <div className="flex items-center gap-1">
            <span className="text-muted">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-base-bright border border-stroke-muted px-2 py-1 text-bright outline-none font-bold"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-base-bright border border-stroke-muted px-2 py-1 text-bright outline-none font-bold"
            />
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Selected Period Revenue</span>
            <DollarSign className="w-5 h-5 text-accent" />
          </div>
          <div className="stat-card__value">PKR 696,570</div>
          <div className="flex items-center gap-1 font-accent text-[1.2rem] text-success">
            <TrendingUp className="w-4 h-4" />
            <span>+12.8% vs prior period</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">FBR Sales Tax Collected</span>
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          </div>
          <div className="stat-card__value text-blue-500">PKR 111,451</div>
          <div className="font-accent text-[1.2rem] text-muted">
            16% Statutory Tax Accrued
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Net Operating Profit</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="stat-card__value text-emerald-500">PKR 202,200</div>
          <div className="font-accent text-[1.2rem] text-emerald-500 font-bold">
            29.0% Net Margin
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Total Orders Processed</span>
            <PieChart className="w-5 h-5 text-purple-500" />
          </div>
          <div className="stat-card__value">568</div>
          <div className="font-accent text-[1.2rem] text-muted">
            Across Lahore & Karachi Branches
          </div>
        </div>
      </div>

      {/* Month-by-Month & Year-by-Year Historical Breakdown Table ("Pichlay Months ka Hisab") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
            Monthly & Yearly Historical Audit Breakdown ("Pichla Hisab Kitab")
          </h3>
          <span className="badge badge-accent font-accent">
            Permanent Audit Trail
          </span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Historical Period</th>
                <th>Total Orders</th>
                <th>Gross Revenue</th>
                <th>FBR Sales Tax</th>
                <th>Net Profit</th>
                <th>Growth Rate</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-accent font-bold text-bright">{row.month}</td>
                  <td className="font-accent">{row.orders} orders</td>
                  <td className="font-accent font-bold text-accent">{row.revenue}</td>
                  <td className="font-accent text-muted">{row.tax}</td>
                  <td className="font-accent font-bold text-emerald-500">{row.profit}</td>
                  <td>
                    <span className="badge badge-success font-accent">{row.growth}</span>
                  </td>
                  <td className="text-right">
                    <button type="button" className="btn btn-secondary py-1 px-3 text-[1.1rem]">
                      <span>Download PDF</span>
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
