"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Search, Filter, ArrowUpDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { ProvisionTenantModal } from "@/components/super-admin/ProvisionTenantModal";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";

export default function TenantsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"expiry" | "health" | "name">("expiry");
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  const fetchTenantsData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, healthRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/super-admin/health"),
      ]);

      const tenantsJson = await tenantsRes.json();
      const healthJson = await healthRes.json();

      if (tenantsJson.success) {
        setTenants(tenantsJson.tenants.filter((t: any) => t.code !== "rst-hq"));
      }

      if (healthJson.success && Array.isArray(healthJson.data?.healthSnapshots)) {
        const map: Record<string, string> = {};
        healthJson.data.healthSnapshots.forEach((h: any) => {
          map[h.organizationId] = h.healthStatus;
        });
        setHealthMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsData();
  }, []);

  // Filter & Search Logic
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.adminName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVertical = selectedVertical === "all" || t.businessType === selectedVertical;
    const matchesStatus = selectedStatus === "all" || t.subscriptionStatus === selectedStatus;

    return matchesSearch && matchesVertical && matchesStatus;
  });

  // Sort Logic
  filteredTenants.sort((a, b) => {
    if (sortBy === "expiry") {
      return a.daysRemaining - b.daysRemaining;
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SuperAdminHeader onOpenNewTenantModal={() => setShowProvisionModal(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              Provisioned Tenants Registry ({filteredTenants.length})
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse, search, and manage access for all provisioned business accounts across verticals
            </p>
          </div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md"
          >
            + Provision New Tenant
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by business name, owner name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">All Verticals</option>
                {Object.entries(VERTICAL_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.title}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="suspended_manual">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>

            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="expiry">Sort: Expiry Soonest</option>
                <option value="name">Sort: Business Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Vertical</th>
                  <th className="p-4">Subscription Status</th>
                  <th className="p-4">Expires In</th>
                  <th className="p-4">Health Badge</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Loading provisioned tenants...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No tenants match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const health = healthMap[tenant.id] || "dormant";
                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => router.push(`/super-admin/tenants/${tenant.id}`)}
                        className="hover:bg-slate-800/80 cursor-pointer transition group"
                      >
                        <td className="p-4">
                          <div className="font-bold text-white group-hover:text-blue-400 transition">{tenant.name}</div>
                          <div className="text-xs text-slate-400">
                            Owner: {tenant.adminName} ({tenant.adminEmail})
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="bg-slate-800 text-slate-300 font-bold text-xs px-2.5 py-1 rounded-md border border-slate-700 uppercase">
                            {tenant.businessType}
                          </span>
                        </td>

                        <td className="p-4">
                          {tenant.subscriptionStatus === "active" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                          )}
                          {tenant.subscriptionStatus === "expiring_soon" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" /> Expiring Soon
                            </span>
                          )}
                          {(tenant.subscriptionStatus === "expired" || tenant.subscriptionStatus === "suspended_manual") && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5" /> {tenant.subscriptionStatus === "suspended_manual" ? "Suspended" : "Expired"}
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-mono font-medium">
                          {tenant.daysRemaining > 0 ? `${tenant.daysRemaining} days` : "Expired"}
                        </td>

                        <td className="p-4">
                          {health === "active" && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">🟢 Actively Used</span>}
                          {health === "slowing" && <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🟡 Slowing Down</span>}
                          {health === "dormant" && <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">🔴 Dormant</span>}
                        </td>

                        <td className="p-4 text-right">
                          <button className="text-slate-400 group-hover:text-white transition p-1.5 hover:bg-slate-700 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchTenantsData}
      />
    </div>
  );
}
