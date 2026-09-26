"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  ArrowUpRight,
  PieChart,
  CheckCircle2,
} from "lucide-react";

type DatePreset = "today" | "7days" | "30days" | "last_month" | "last_year" | "custom";

// Local-time YYYY-MM-DD (toISOString would shift the date across the UTC boundary)
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presetRange(preset: Exclude<DatePreset, "custom">): { start: string; end: string } {
  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  switch (preset) {
    case "today":
      return { start: ymd(today), end: ymd(today) };
    case "7days":
      return { start: ymd(daysAgo(6)), end: ymd(today) };
    case "30days":
      return { start: ymd(daysAgo(29)), end: ymd(today) };
    case "last_month":
      return {
        start: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case "last_year":
      return {
        start: ymd(new Date(today.getFullYear() - 1, 0, 1)),
        end: ymd(new Date(today.getFullYear() - 1, 11, 31)),
      };
  }
}

export default function ReportsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30days");
  const [startDate, setStartDate] = useState(() => presetRange("30days").start);
  const [endDate, setEndDate] = useState(() => presetRange("30days").end);

  const applyPreset = (preset: Exclude<DatePreset, "custom">) => {
    const range = presetRange(preset);
    setDatePreset(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const fmt = (n: number) => `PKR ${Math.round(Number(n) || 0).toLocaleString()}`;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const summary = reportData?.summary || {};
  const netRevenue = summary.netRevenue ?? summary.totalRevenue ?? 0;
  const netTax = summary.netTax ?? summary.totalTax ?? 0;
  const grossProfit = netRevenue - netTax - (summary.totalCogs || 0);
  const margin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // Real month-by-month history from the sales-summary API (newest first)
  const breakdown: any[] = reportData?.monthlyBreakdown || [];
  const monthlyHistory = breakdown.map((m, idx) => {
    const revenue = m.monthlyRevenue || 0;
    const tax = m.monthlyTax || 0;
    const profit = revenue - tax - (m.monthlyCogs || 0);
    const previous = breakdown[idx + 1];
    const growth =
      previous && previous.monthlyRevenue > 0
        ? `${revenue >= previous.monthlyRevenue ? "+" : ""}${(((revenue - previous.monthlyRevenue) / previous.monthlyRevenue) * 100).toFixed(1)}%`
        : "—";
    return {
      month: `${MONTHS[(m._id?.month || 1) - 1]} ${m._id?.year}`,
      orders: m.ordersCount || 0,
      revenue: fmt(revenue),
      tax: fmt(tax),
      profit: fmt(profit),
      growth,
    };
  });

  const handleExportCSV = () => {
    const headers = ["Historical Period", "Total Orders", "Gross Revenue", "FBR Sales Tax", "Net Profit", "Growth Rate"];
    const rows = monthlyHistory.map((r) => [
      `"${r.month}"`,
      r.orders,
      `"${r.revenue}"`,
      `"${r.tax}"`,
      `"${r.profit}"`,
      `"${r.growth}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RST_POS_Sales_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice("CSV sales summary report exported successfully!");
    setTimeout(() => setExportNotice(""), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Historical Financial & Sales Reports (&quot;Hisab Kitab&quot;)
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
          <button type="button" onClick={handleExportCSV} className="btn btn-primary py-3 px-5 text-[1.3rem]">
            <Download className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

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
            { id: "last_year", label: `Previous Year (${new Date().getFullYear() - 1})` },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as Exclude<DatePreset, "custom">)}
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
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
              }}
              className="bg-base-bright border border-stroke-muted px-2 py-1 text-bright outline-none font-bold"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
              }}
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
          <div className="stat-card__value">{fmt(netRevenue)}</div>
          <div className="flex items-center gap-1 font-accent text-[1.2rem] text-success">
            <TrendingUp className="w-4 h-4" />
            <span>
              Gross {fmt(summary.totalRevenue || 0)} − Refunds {fmt(summary.totalRefunds || 0)}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">FBR Sales Tax Collected</span>
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          </div>
          <div className="stat-card__value text-blue-500">{fmt(netTax)}</div>
          <div className="font-accent text-[1.2rem] text-muted">
            Net of refunded tax
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Gross Profit (after COGS)</span>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="stat-card__value text-emerald-500">{fmt(grossProfit)}</div>
          <div className="font-accent text-[1.2rem] text-emerald-500 font-bold">
            {margin.toFixed(1)}% Gross Margin
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Total Orders Processed</span>
            <PieChart className="w-5 h-5 text-purple-500" />
          </div>
          <div className="stat-card__value">{(summary.totalOrders || 0).toLocaleString()}</div>
          <div className="font-accent text-[1.2rem] text-muted">
            {summary.refundCount ? `${summary.refundCount} refund(s) in period` : "In selected period"}
          </div>
        </div>
      </div>

      {/* Month-by-Month & Year-by-Year Historical Breakdown Table ("Pichlay Months ka Hisab") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
            Monthly & Yearly Historical Audit Breakdown (&quot;Pichla Hisab Kitab&quot;)
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
              {!loading && monthlyHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted p-6">No sales in the selected period.</td>
                </tr>
              )}
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
                    <button type="button" onClick={() => window.print()} className="btn btn-secondary py-1 px-3 text-[1.1rem]">
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
