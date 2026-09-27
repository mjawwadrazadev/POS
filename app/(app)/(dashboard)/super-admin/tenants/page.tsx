"use client";

import { useEffect, useState } from "react";
import { useSessionUser } from "@/components/layout/SessionContext";
import { canPerformPlatformAction } from "@/lib/auth/permissions";
import { useRouter } from "next/navigation";
import { Building2, Search, Filter, ArrowUpDown, ChevronRight, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { ProvisionTenantModal } from "@/components/super-admin/ProvisionTenantModal";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";

// Every subscription status the API can return, including manual and automatic suspension and termination
const STATUS_BADGES: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  expiring_soon: { label: "Expiring Soon", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle },
  expired: { label: "Expired", className: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: XCircle },
  suspended: { label: "Suspended", className: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: XCircle },
  suspended_manual: { label: "Suspended", className: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: XCircle },
  terminated: { label: "Terminated", className: "bg-stroke-muted text-muted border-stroke-medium", icon: XCircle },
};

export default function TenantsListPage() {
  const sessionUser = useSessionUser();
  const canProvision = canPerformPlatformAction(sessionUser?.role, "manage_pricing");
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
        setTenants(tenantsJson.tenants.filter((t: any) => !t.isPlatformOrg));
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
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" />
              Provisioned Tenants Registry ({filteredTenants.length})
            </h1>
            <p className="text-[1.4rem] text-muted mt-1">
              Browse, search, and manage access for all provisioned business accounts across verticals
            </p>
          </div>
          {canProvision && (
            <button
              onClick={() => setShowProvisionModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition shadow-md"
            >
              + Provision New Tenant
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-base-tint border border-stroke-muted p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by business name, owner name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-base border border-stroke-muted rounded-xl text-[1.4rem] text-bright placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted" />
              <select
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="bg-base border border-stroke-muted text-bright text-[1.4rem] rounded-xl px-3 py-2 focus:outline-none"
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
              className="bg-base border border-stroke-muted text-bright text-[1.4rem] rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="suspended_manual">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>

            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-base border border-stroke-muted text-bright text-[1.4rem] rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="expiry">Sort: Expiry Soonest</option>
                <option value="name">Sort: Business Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-base-tint border border-stroke-muted rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[1.4rem]">
              <thead>
                <tr className="bg-base border-b border-stroke-muted text-muted text-[1.2rem] font-bold uppercase tracking-wider">
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Vertical</th>
                  <th className="p-4">Subscription Status</th>
                  <th className="p-4">Expires In</th>
                  <th className="p-4">Health Badge</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-muted">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted">
                      Loading provisioned tenants...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted">
                      No tenants match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    // Terminated tenants are closed, so they have no activity health
                    const health = tenant.subscriptionStatus === "terminated" ? null : healthMap[tenant.id] || "dormant";
                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => router.push(`/super-admin/tenants/${tenant.id}`)}
                        className="hover:bg-accent-subtle cursor-pointer transition group"
                      >
                        <td className="p-4">
                          <div className="font-bold text-bright group-hover:text-accent transition">{tenant.name}</div>
                          <div className="text-[1.2rem] text-muted">
                            Owner: {tenant.adminName} ({tenant.adminEmail})
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="bg-base text-medium font-bold text-[1.2rem] px-2.5 py-1 rounded-md border border-stroke-medium uppercase">
                            {tenant.businessType}
                          </span>
                        </td>

                        <td className="p-4">
                          {(() => {
                            const badge = STATUS_BADGES[tenant.subscriptionStatus] || STATUS_BADGES.expired;
                            const Icon = badge.icon;
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[1.2rem] font-bold border ${badge.className}`}>
                                <Icon className="w-3.5 h-3.5" /> {badge.label}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="p-4 font-mono font-medium">
                          {tenant.subscriptionStatus === "terminated"
                            ? "—"
                            : tenant.daysRemaining > 0
                              ? `${tenant.daysRemaining} days`
                              : "Expired"}
                        </td>

                        <td className="p-4">
                          {health === "active" && <span className="text-[1.2rem] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">🟢 Actively Used</span>}
                          {health === "slowing" && <span className="text-[1.2rem] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🟡 Slowing Down</span>}
                          {health === "dormant" && <span className="text-[1.2rem] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">🔴 Dormant</span>}
                          {!health && <span className="text-[1.2rem] text-muted">—</span>}
                        </td>

                        <td className="p-4 text-right">
                          <button className="text-muted group-hover:text-bright transition p-1.5 hover:bg-accent-subtle rounded-lg">
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

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchTenantsData}
      />
    </div>
  );
}
