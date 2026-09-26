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
    <div className="space-y-8">
        {/* Title banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-accent" />
              SaaS Business Command Center
            </h1>
            <p className="text-[1.4rem] text-muted mt-1">
              Platform-wide financial analytics, tenant health scorecards, and revenue tracking
            </p>
          </div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition shadow-md"
          >
            + Provision New Client
          </button>
        </div>

        {/* Row 1: Key Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-muted text-[1.2rem] font-bold uppercase tracking-wider">
              <span>Total Provisioned Tenants</span>
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div className="text-[3rem] font-black text-bright">{totalTenants}</div>
            <div className="text-[1.2rem] text-muted">All registered tenant orgs</div>
          </div>

          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-muted text-[1.2rem] font-bold uppercase tracking-wider">
              <span>Active Subscriptions</span>
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-[3rem] font-black text-emerald-600">{activeTenants}</div>
            <div className="text-[1.2rem] text-emerald-500/80 font-medium">Valid active access</div>
          </div>

          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-muted text-[1.2rem] font-bold uppercase tracking-wider">
              <span>Expiring Soon (≤7 Days)</span>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-[3rem] font-black text-amber-600">{expiringSoonTenants}</div>
            <div className="text-[1.2rem] text-amber-500/80 font-medium">Requires renewal outreach</div>
          </div>

          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-muted text-[1.2rem] font-bold uppercase tracking-wider">
              <span>Monthly Recurring Revenue (MRR)</span>
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-[3rem] font-black text-bright">PKR {totalMRR.toLocaleString()}</div>
            <div className="text-[1.2rem] text-muted">Monthly normalized subscription fee</div>
          </div>
        </div>

        {/* Row 2: MRR Trend & Health Donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MRR Trend Chart */}
          <div className="lg:col-span-2 bg-base-tint border border-stroke-muted rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-bright text-[1.6rem]">Monthly Recurring Revenue (MRR) Trend</h3>
                <p className="text-[1.2rem] text-muted">12-month platform revenue growth projection</p>
              </div>
              <span className="text-[1.2rem] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                +14.2% Growth
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="h-64 w-full pt-4 flex items-end justify-between gap-4 border-b border-stroke-muted pb-2">
              {mrrTrendData.map((d, i) => {
                const heightPercent = Math.min(100, Math.max(15, (d.mrr / 300000) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[11px] font-bold text-medium opacity-0 group-hover:opacity-100 transition">
                      PKR {d.mrr.toLocaleString()}
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:brightness-125"
                    />
                    <span className="text-[1.2rem] font-bold text-muted">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tenant Health Breakdown */}
          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-bright text-[1.6rem]">Tenant Operational Health Score</h3>
              <p className="text-[1.2rem] text-muted">Active POS order activity monitoring</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-base rounded-xl border border-stroke-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[1.4rem] font-semibold text-bright">🟢 Actively Used (Sales ≤ 3d)</span>
                </div>
                <span className="font-bold text-emerald-600">{activeHealth} tenants</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-base rounded-xl border border-stroke-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-[1.4rem] font-semibold text-bright">🟡 Slowing Down (Sales 4-14d)</span>
                </div>
                <span className="font-bold text-amber-600">{slowingHealth} tenants</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-base rounded-xl border border-stroke-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-[1.4rem] font-semibold text-bright">🔴 Dormant (No sales &gt; 14d)</span>
                </div>
                <span className="font-bold text-rose-600">{dormantHealth} tenants</span>
              </div>
            </div>

            <div className="pt-2 border-t border-stroke-muted text-center">
              <Link href="/super-admin/tenants" className="text-[1.2rem] text-accent font-bold hover:underline inline-flex items-center gap-1">
                View Full Health Scorecard Table <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Row 3: Revenue by Vertical Bar Chart */}
        <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-bright text-[1.6rem]">Subscription Revenue by Business Vertical</h3>
          <div className="h-56 w-full pt-2 flex items-end justify-between gap-6 border-b border-stroke-muted pb-2">
            {verticalRevenueData.map((d: any, i: number) => {
              const heightPercent = Math.min(100, Math.max(10, (d.amount / maxBarAmount) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[11px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                    PKR {Number(d.amount).toLocaleString()}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-indigo-600 rounded-t-lg transition-all duration-300 group-hover:bg-indigo-500"
                  />
                  <span className="text-[1.2rem] font-bold text-muted uppercase">{d.vertical}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: ⚠️ Action Items Queue */}
        <div className="bg-base-tint border border-amber-900/40 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-amber-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-[1.8rem]">⚠️ Action Items Queue (Requires Attention Today)</h3>
          </div>

          <div className="divide-y divide-stroke-muted">
            {actionItems.length === 0 ? (
              <div className="p-4 text-muted text-[1.4rem] italic">All tenant accounts are active and healthy! No immediate actions required.</div>
            ) : (
              actionItems.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/super-admin/tenants/${item.id}`}
                  className="p-4 hover:bg-accent-subtle transition flex items-center justify-between group rounded-xl block"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-bright group-hover:text-accent transition">{item.name}</div>
                    <div className="text-[1.2rem] text-muted">
                      Owner: {item.adminName} ({item.adminEmail}) · Vertical: {item.businessType.toUpperCase()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-[1.2rem] font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Expires in {item.daysRemaining} days ({new Date(item.expiryDate).toLocaleDateString()})
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-bright transition" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
