"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { ProvisionTenantModal } from "@/components/super-admin/ProvisionTenantModal";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [tenantsRes, healthRes, revenueRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/super-admin/health"),
        fetch("/api/super-admin/revenue"),
      ]);

      const tenantsJson = await tenantsRes.json();
      const healthJson = await healthRes.json();
      const revenueJson = await revenueRes.json();

      if (tenantsJson.success) setStats(tenantsJson);
      if (healthJson.success) setHealthData(healthJson.data);
      if (revenueJson.success) setRevenueData(revenueJson.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute stat card numbers
  const totalTenants = stats?.tenants?.filter((t: any) => t.code !== "rst-hq")?.length || 0;
  const activeTenants = stats?.tenants?.filter((t: any) => t.subscriptionStatus === "active" && t.code !== "rst-hq")?.length || 0;
  const expiringSoonTenants = stats?.tenants?.filter((t: any) => t.subscriptionStatus === "expiring_soon" && t.code !== "rst-hq")?.length || 0;
  const totalMRR = revenueData?.totalMRR || stats?.stats?.totalMRR || 0;

  // Health distribution
  const activeHealth = healthData?.summary?.activeCount || 0;
  const slowingHealth = healthData?.summary?.slowingCount || 0;
  const dormantHealth = healthData?.summary?.dormantCount || 0;

  // Action Items Queue
  const actionItems = (stats?.tenants || [])
    .filter((t: any) => t.code !== "rst-hq")
    .filter((t: any) => t.subscriptionStatus === "expiring_soon" || t.subscriptionStatus === "expired" || t.daysRemaining <= 7)
    .slice(0, 5);

  const mrrTrendData = [
    { month: "Apr", mrr: 120000 },
    { month: "May", mrr: 150000 },
    { month: "Jun", mrr: 180000 },
    { month: "Jul", mrr: 210000 },
    { month: "Aug", mrr: 245000 },
    { month: "Sep", mrr: totalMRR > 0 ? totalMRR : 285000 },
  ];

  const verticalRevenueData = revenueData?.revenueByVertical || [
    { vertical: "Bakery", amount: 45000 },
    { vertical: "Restaurant", amount: 75000 },
    { vertical: "Pharmacy", amount: 60000 },
    { vertical: "Retail", amount: 35000 },
    { vertical: "Hospital", amount: 50000 },
  ];

  const maxBarAmount = Math.max(...verticalRevenueData.map((d: any) => d.amount || 1), 100000);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SuperAdminHeader onOpenNewTenantModal={() => setShowProvisionModal(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Title banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              SaaS Business Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Platform-wide financial analytics, tenant health scorecards, and revenue tracking
            </p>
          </div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md"
          >
            + Provision New Client
          </button>
        </div>

        {/* Row 1: Key Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Provisioned Tenants</span>
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white">{totalTenants}</div>
            <div className="text-xs text-slate-400">All registered tenant orgs</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Active Subscriptions</span>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400">{activeTenants}</div>
            <div className="text-xs text-emerald-500/80 font-medium">Valid active access</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Expiring Soon (≤7 Days)</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-400">{expiringSoonTenants}</div>
            <div className="text-xs text-amber-500/80 font-medium">Requires renewal outreach</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Monthly Recurring Revenue (MRR)</span>
              <DollarSign className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white">PKR {totalMRR.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Monthly normalized subscription fee</div>
          </div>
        </div>

        {/* Row 2: MRR Trend & Health Donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MRR Trend Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base">Monthly Recurring Revenue (MRR) Trend</h3>
                <p className="text-xs text-slate-400">12-month platform revenue growth projection</p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                +14.2% Growth
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="h-64 w-full pt-4 flex items-end justify-between gap-4 border-b border-slate-800 pb-2">
              {mrrTrendData.map((d, i) => {
                const heightPercent = Math.min(100, Math.max(15, (d.mrr / 300000) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[11px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition">
                      PKR {d.mrr.toLocaleString()}
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:brightness-125"
                    />
                    <span className="text-xs font-bold text-slate-400">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tenant Health Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Tenant Operational Health Score</h3>
              <p className="text-xs text-slate-400">Active POS order activity monitoring</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-semibold text-slate-200">🟢 Actively Used (Sales ≤ 3d)</span>
                </div>
                <span className="font-bold text-emerald-400">{activeHealth} tenants</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-semibold text-slate-200">🟡 Slowing Down (Sales 4-14d)</span>
                </div>
                <span className="font-bold text-amber-400">{slowingHealth} tenants</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-sm font-semibold text-slate-200">🔴 Dormant (No sales &gt; 14d)</span>
                </div>
                <span className="font-bold text-rose-400">{dormantHealth} tenants</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-center">
              <Link href="/super-admin/tenants" className="text-xs text-blue-400 font-bold hover:underline inline-flex items-center gap-1">
                View Full Health Scorecard Table <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Row 3: Revenue by Vertical Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-white text-base">Subscription Revenue by Business Vertical</h3>
          <div className="h-56 w-full pt-2 flex items-end justify-between gap-6 border-b border-slate-800 pb-2">
            {verticalRevenueData.map((d: any, i: number) => {
              const heightPercent = Math.min(100, Math.max(10, (d.amount / maxBarAmount) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[11px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition">
                    PKR {Number(d.amount).toLocaleString()}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-indigo-600 rounded-t-lg transition-all duration-300 group-hover:bg-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase">{d.vertical}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: ⚠️ Action Items Queue */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg">⚠️ Action Items Queue (Requires Attention Today)</h3>
          </div>

          <div className="divide-y divide-slate-800">
            {actionItems.length === 0 ? (
              <div className="p-4 text-slate-400 text-sm italic">All tenant accounts are active and healthy! No immediate actions required.</div>
            ) : (
              actionItems.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/super-admin/tenants/${item.id}`}
                  className="p-4 hover:bg-slate-800/80 transition flex items-center justify-between group rounded-xl block"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white group-hover:text-blue-400 transition">{item.name}</div>
                    <div className="text-xs text-slate-400">
                      Owner: {item.adminName} ({item.adminEmail}) · Vertical: {item.businessType.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Expires in {item.daysRemaining} days ({new Date(item.expiryDate).toLocaleDateString()})
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
