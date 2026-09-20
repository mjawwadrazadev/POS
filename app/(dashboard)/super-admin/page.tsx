"use client";

import { useState, useEffect } from "react";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  Building2,
  Plus,
  ShieldCheck,
  Search,
  Key,
  Copy,
  Check,
  Store,
  Users,
  Package,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  Cake,
  Utensils,
  Pill,
  Tv,
  Shirt,
  Scissors,
  PhoneCall,
  Calendar,
  CreditCard,
  AlertTriangle,
  Clock,
  Ban,
  CheckCircle2,
  DollarSign,
  History,
} from "lucide-react";

interface PaymentRecord {
  amount: number;
  paymentDate: string;
  monthsAdded: number;
  notes?: string;
}

interface Tenant {
  id: string;
  name: string;
  code: string;
  businessType: BusinessType;
  currency: string;
  taxRate: number;
  phone: string;
  email: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPin: string;
  subscriptionPlan: "monthly" | "yearly" | "custom";
  subscriptionFee: number;
  subscriptionStatus: "active" | "expiring_soon" | "expired" | "suspended";
  startDate: string;
  expiryDate: string;
  lastPaymentDate?: string;
  daysRemaining: number;
  paymentHistory?: PaymentRecord[];
  branchCount: number;
  userCount: number;
  productCount: number;
  createdAt: string;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState({
    totalMRR: 0,
    activeCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Renew / Record Payment Modal State
  const [renewTenant, setRenewTenant] = useState<Tenant | null>(null);
  const [renewAmount, setRenewAmount] = useState<number>(5000);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [renewNotes, setRenewNotes] = useState("Monthly Subscription Renewal");
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // Payment History Modal
  const [historyTenant, setHistoryTenant] = useState<Tenant | null>(null);

  // New Tenant Form State
  const [form, setForm] = useState({
    name: "",
    businessType: "restaurant" as BusinessType,
    adminName: "",
    adminEmail: "",
    adminPin: "1234",
    phone: "",
    address: "",
    taxRate: 16.0,
    planTier: "billing_accounting" as "billing_only" | "billing_accounting",
    dataRetentionMonths: 6,
    subscriptionPlan: "monthly",
    subscriptionFee: 5000,
    durationMonths: 1,
    createSampleMenu: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const verticalIcons: Record<BusinessType, React.ReactNode> = {
    bakery: <Cake className="w-4 h-4 text-amber-400" />,
    restaurant: <Utensils className="w-4 h-4 text-emerald-400" />,
    cafe: <Utensils className="w-4 h-4 text-amber-300" />,
    pharmacy: <Pill className="w-4 h-4 text-rose-400" />,
    retail: <Store className="w-4 h-4 text-blue-400" />,
    supermarket: <Store className="w-4 h-4 text-cyan-400" />,
    electronics: <Tv className="w-4 h-4 text-purple-400" />,
    clothing: <Shirt className="w-4 h-4 text-pink-400" />,
    salon: <Scissors className="w-4 h-4 text-teal-400" />,
  };

  async function fetchTenants() {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create tenant");
      }

      setCreatedTenant({
        name: form.name,
        businessType: form.businessType,
        adminEmail: form.adminEmail,
        adminPin: form.adminPin,
        adminName: form.adminName || `${form.name} Owner`,
        subscriptionFee: form.subscriptionFee,
        expiryDate: data.tenant.expiryDate,
      });

      setShowCreateModal(false);
      setForm({
        name: "",
        businessType: "restaurant",
        adminName: "",
        adminEmail: "",
        adminPin: "1234",
        phone: "",
        address: "",
        taxRate: 16.0,
        planTier: "billing_accounting",
        dataRetentionMonths: 6,
        subscriptionPlan: "monthly",
        subscriptionFee: 5000,
        durationMonths: 1,
        createSampleMenu: true,
      });


      fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRenewSubmit() {
    if (!renewTenant) return;
    setRenewSubmitting(true);

    try {
      const res = await fetch(`/api/tenants/${renewTenant.id}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: renewAmount,
          monthsAdded: renewMonths,
          notes: renewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to renew subscription");
      }

      setRenewTenant(null);
      fetchTenants();
    } catch (err: any) {
      alert(err.message || "Failed to renew subscription");
    } finally {
      setRenewSubmitting(false);
    }
  }

  async function handleToggleSuspend(tenant: Tenant) {
    const isSuspended = tenant.subscriptionStatus === "suspended";
    const action = isSuspended ? "unsuspend" : "suspend";
    const confirmMsg = isSuspended
      ? `Re-activate access for ${tenant.name}?`
      : `Block & suspend access for ${tenant.name}? They will be locked out on login.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        fetchTenants();
      }
    } catch (err) {
      console.error("Failed to toggle suspension", err);
    }
  }

  function handleCopyCredentials() {
    if (!createdTenant) return;
    const text = `🔑 RST POS Access Credentials for ${createdTenant.name}:\n\nBusiness Type: ${createdTenant.businessType.toUpperCase()}\nLogin Email: ${createdTenant.adminEmail}\nQuick PIN: ${createdTenant.adminPin}\nSubscription Fee: PKR ${createdTenant.subscriptionFee?.toLocaleString() || 5000}/month\nPortal Link: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const expiringSoonTenants = tenants.filter(
    (t) => t.code !== "rst-hq" && (t.subscriptionStatus === "expiring_soon" || (t.daysRemaining <= 7 && t.daysRemaining > 0))
  );

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "All" || t.businessType === filterType;
    const matchStatus =
      filterStatus === "All" ||
      (filterStatus === "active" && t.subscriptionStatus === "active") ||
      (filterStatus === "expiring_soon" && (t.subscriptionStatus === "expiring_soon" || (t.daysRemaining <= 7 && t.daysRemaining > 0))) ||
      (filterStatus === "expired" && (t.subscriptionStatus === "expired" || t.subscriptionStatus === "suspended" || t.daysRemaining <= 0));
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Super Admin — Tenant & Subscription Billing Center
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Provision new vertical tenants, manage monthly/yearly subscription fees, track call reminders, and renew client access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTenants}
            className="btn btn-secondary py-3 px-4 text-[1.3rem]"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary py-3 px-6 text-[1.3rem]"
          >
            <Plus className="w-5 h-5" />
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {/* Subscription Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Card 1: Monthly Recurring Revenue (MRR) */}
        <div className="stat-card border-l-4 border-l-emerald-500">
          <div className="stat-card__header">
            <span className="stat-card__title">Monthly Recurring Revenue (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="stat-card__value text-emerald-400">
            PKR {stats.totalMRR.toLocaleString()} <span className="text-[1.2rem] text-gray-400 font-normal">/mo</span>
          </div>
          <div className="stat-card__trend positive">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Subscriptions</span>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="stat-card border-l-4 border-l-blue-500">
          <div className="stat-card__header">
            <span className="stat-card__title">Active Business Tenants</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="stat-card__value">{stats.activeCount}</div>
          <div className="stat-card__trend positive">
            <span>Fully Paid & Active</span>
          </div>
        </div>

        {/* Card 3: Expiring Soon (7 Days Alert) */}
        <div className="stat-card border-l-4 border-l-amber-500">
          <div className="stat-card__header">
            <span className="stat-card__title">Expiring Soon (Call Reminders)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="stat-card__value text-amber-400">{stats.expiringSoonCount}</div>
          <div className="stat-card__trend warning">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call for Renewal Payment</span>
          </div>
        </div>

        {/* Card 4: Expired / Blocked */}
        <div className="stat-card border-l-4 border-l-red-500">
          <div className="stat-card__header">
            <span className="stat-card__title">Expired / Blocked Tenants</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="stat-card__value text-red-400">{stats.expiredCount}</div>
          <div className="stat-card__trend negative">
            <span>Login Access Suspended</span>
          </div>
        </div>
      </div>

      {/* EXPIRING SOON CALL REMINDER BANNER (If any <= 7 days) */}
      {expiringSoonTenants.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-accent font-extrabold text-[1.4rem] uppercase">
              <PhoneCall className="w-5 h-5 animate-bounce" />
              <span>Call Reminders — Tenants Expiring Within 7 Days ({expiringSoonTenants.length})</span>
            </div>
            <span className="text-[1.2rem] font-accent text-amber-300">
              Call owner to collect fee before access auto-blocks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringSoonTenants.map((t) => (
              <div
                key={t.id}
                className="bg-[#171719] border border-amber-500/40 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[1.4rem] text-white">{t.name}</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[1.1rem] font-accent font-bold">
                      {t.daysRemaining <= 0 ? "EXPIRED TODAY" : `${t.daysRemaining} DAYS LEFT`}
                    </span>
                  </div>
                  <div className="text-[1.2rem] font-accent text-gray-300 mt-2 space-y-1">
                    <div>Owner: <b>{t.adminName}</b></div>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{t.phone || "No phone entered"}</span>
                    </div>
                    <div>Fee: <b className="text-amber-300">PKR {t.subscriptionFee.toLocaleString()} / mo</b></div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRenewTenant(t);
                    setRenewAmount(t.subscriptionFee || 5000);
                  }}
                  className="w-full btn btn-primary py-2 text-[1.2rem] flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record Renewal Payment</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[20rem] flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by business name, phone, or email..."
            className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-base-bright border border-stroke-muted text-bright px-3 py-2 text-[1.3rem] font-accent font-semibold outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active (Paid)</option>
            <option value="expiring_soon">Expiring Soon (Within 7 Days)</option>
            <option value="expired">Expired / Blocked</option>
          </select>

          {/* Vertical Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-base-bright border border-stroke-muted text-bright px-3 py-2 text-[1.3rem] font-accent font-semibold outline-none cursor-pointer"
          >
            <option value="All">All Verticals</option>
            {Object.entries(VERTICAL_CONFIGS).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.title}</option>
            ))}
          </select>

          <span className="font-accent text-[1.2rem] text-muted border border-stroke-muted px-3 py-2 bg-base-bright">
            {filteredTenants.length} tenants
          </span>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Vertical Engine</th>
              <th>Contact Phone</th>
              <th>Admin Email & PIN</th>
              <th>Subscription Fee</th>
              <th>Access Status & Expiry</th>
              <th className="text-right">Subscription Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  Loading tenant billing accounts from database...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  No tenants found. Click "Provision New Tenant" to add one.
                </td>
              </tr>
            ) : (
              filteredTenants.map((t) => {
                const isHQ = t.code === "rst-hq";
                const isExpiring = t.subscriptionStatus === "expiring_soon" || (t.daysRemaining <= 7 && t.daysRemaining > 0);
                const isExpired = t.subscriptionStatus === "expired" || t.subscriptionStatus === "suspended" || t.daysRemaining <= 0;

                return (
                  <tr key={t.id} className={isExpired ? "bg-red-500/5" : isExpiring ? "bg-amber-500/5" : ""}>
                    <td className="font-bold text-bright">
                      <div className="flex flex-col">
                        <span className="text-[1.4rem]">{t.name}</span>
                        <span className="font-accent text-[1.1rem] text-muted font-normal">{t.code}</span>
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 font-accent font-bold text-[1.2rem]">
                        {verticalIcons[t.businessType]}
                        <span className="text-bright uppercase">
                          {VERTICAL_CONFIGS[t.businessType]?.title || t.businessType}
                        </span>
                      </div>
                    </td>

                    <td className="font-accent text-bright font-semibold">
                      <div className="flex items-center gap-1 text-emerald-400">
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{t.phone || "N/A"}</span>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col font-accent text-[1.2rem]">
                        <span className="text-accent font-bold">{t.adminEmail}</span>
                        <span className="text-emerald-400 font-bold">🔑 PIN: {t.adminPin}</span>
                      </div>
                    </td>

                    <td>
                      {isHQ ? (
                        <span className="font-accent text-muted">System Master</span>
                      ) : (
                        <div className="font-accent">
                          <span className="font-extrabold text-[1.4rem] text-bright">
                            PKR {t.subscriptionFee.toLocaleString()}
                          </span>
                          <span className="text-[1.1rem] text-muted block uppercase">
                            / {t.subscriptionPlan}
                          </span>
                        </div>
                      )}
                    </td>

                    <td>
                      {isHQ ? (
                        <span className="badge badge-accent">HQ LIFETIME</span>
                      ) : (
                        <div className="space-y-1">
                          {isExpired ? (
                            <span className="badge badge-error flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              EXPIRED / BLOCKED
                            </span>
                          ) : isExpiring ? (
                            <span className="badge badge-warning flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 animate-pulse" />
                              EXPIRING ({t.daysRemaining}d Left)
                            </span>
                          ) : (
                            <span className="badge badge-success flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              ACTIVE ({t.daysRemaining}d Left)
                            </span>
                          )}
                          <div className="text-[1.1rem] font-accent text-muted">
                            Expires: {new Date(t.expiryDate).toLocaleDateString("en-PK")}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="text-right">
                      {!isHQ && (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Renewal Payment */}
                          <button
                            onClick={() => {
                              setRenewTenant(t);
                              setRenewAmount(t.subscriptionFee || 5000);
                            }}
                            className="btn btn-primary py-1 px-2.5 text-[1.1rem] flex items-center gap-1"
                            title="Record Payment & Renew Access"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Renew Fee</span>
                          </button>

                          {/* Payment History */}
                          <button
                            onClick={() => setHistoryTenant(t)}
                            className="p-1.5 text-muted hover:text-white hover:bg-base-bright border border-stroke-muted"
                            title="View Payment Logs"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Toggle Suspend */}
                          <button
                            onClick={() => handleToggleSuspend(t)}
                            className={`p-1.5 border transition-colors ${
                              t.subscriptionStatus === "suspended"
                                ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                : "text-error border-red-500/30 hover:bg-red-500/10"
                            }`}
                            title={t.subscriptionStatus === "suspended" ? "Unsuspend Tenant" : "Suspend Tenant Access"}
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          {/* Credentials */}
                          <button
                            onClick={() => {
                              setCreatedTenant({
                                name: t.name,
                                businessType: t.businessType,
                                adminEmail: t.adminEmail,
                                adminPin: t.adminPin,
                                adminName: t.adminName,
                                subscriptionFee: t.subscriptionFee,
                              });
                            }}
                            className="p-1.5 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30"
                            title="View Credentials"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Renewal Payment Modal */}
      {renewTenant && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-emerald-500/40 w-full max-w-md p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-accent font-extrabold text-[1.5rem] uppercase">
                <CreditCard className="w-5 h-5" />
                <span>Record Subscription Renewal Payment</span>
              </div>
              <button onClick={() => setRenewTenant(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0b0b0d] border border-[rgba(255,255,255,0.1)] p-4 font-accent text-[1.3rem] space-y-1">
              <div className="font-bold text-white text-[1.5rem]">{renewTenant.name}</div>
              <div className="text-gray-400">Owner: {renewTenant.adminName} ({renewTenant.phone})</div>
              <div className="text-amber-400">Current Expiry: {new Date(renewTenant.expiryDate).toLocaleDateString("en-PK")}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label text-[rgba(255,255,255,0.6)]">Payment Amount Received (PKR) *</label>
                <input
                  type="number"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(Number(e.target.value))}
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-emerald-400 font-bold px-3 py-2.5 text-[1.6rem] outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="form-label text-[rgba(255,255,255,0.6)]">Extend Access Duration</label>
                <select
                  value={renewMonths}
                  onChange={(e) => setRenewMonths(Number(e.target.value))}
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value={1} className="bg-[#0b0b0d]">1 Month (+30 Days)</option>
                  <option value={3} className="bg-[#0b0b0d]">3 Months (+90 Days)</option>
                  <option value={6} className="bg-[#0b0b0d]">6 Months (+180 Days)</option>
                  <option value={12} className="bg-[#0b0b0d]">1 Year (+365 Days)</option>
                </select>
              </div>

              <div>
                <label className="form-label text-[rgba(255,255,255,0.6)]">Payment Notes / Reference</label>
                <input
                  type="text"
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  placeholder="e.g. Cash / Bank Transfer Ref #9921"
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => setRenewTenant(null)}
                className="flex-1 btn btn-secondary py-3 bg-[#0b0b0d] text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRenewSubmit}
                disabled={renewSubmitting}
                className="flex-1 btn btn-primary py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {renewSubmitting ? "Saving..." : "Confirm & Renew Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Log Modal */}
      {historyTenant && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-lg p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="flex items-center gap-2 text-blue-400 font-accent font-extrabold text-[1.5rem] uppercase">
                <History className="w-5 h-5" />
                <span>Subscription Payment Log — {historyTenant.name}</span>
              </div>
              <button onClick={() => setHistoryTenant(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {!historyTenant.paymentHistory || historyTenant.paymentHistory.length === 0 ? (
                <div className="text-center py-6 text-gray-400 font-accent text-[1.3rem]">
                  No prior payment history logged.
                </div>
              ) : (
                historyTenant.paymentHistory.map((rec, idx) => (
                  <div key={idx} className="bg-[#0b0b0d] border border-[rgba(255,255,255,0.1)] p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[1.4rem] text-emerald-400">
                        PKR {rec.amount.toLocaleString()}
                      </div>
                      <div className="text-[1.2rem] font-accent text-gray-400 mt-0.5">
                        {rec.notes || "Renewal Fee"} (+{rec.monthsAdded} month access)
                      </div>
                    </div>
                    <div className="text-[1.2rem] font-accent text-gray-400 text-right">
                      {new Date(rec.paymentDate).toLocaleDateString("en-PK")}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHistoryTenant(null)}
                className="btn btn-secondary py-2.5 px-6 bg-[#0b0b0d] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-2xl shadow-2xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#819ffe]" />
                <h3 className="font-accent font-extrabold text-[1.5rem] uppercase text-white">
                  Provision New Business Tenant
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTenant} className="p-5 space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 p-3 text-[1.2rem]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: Business Name & Vertical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Business / Tenant Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Al-Madina Restaurant & Grill"
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Vertical Engine Type *</label>
                  <select
                    value={form.businessType}
                    onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba] appearance-none cursor-pointer"
                  >
                    {Object.entries(VERTICAL_CONFIGS).map(([key, cfg]) => (
                      <option key={key} value={key} className="bg-[#0b0b0d]">
                        {cfg.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Subscription Fee, Plan Tier & Data Retention */}
              <div className="border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                <p className="font-accent text-[1.2rem] text-emerald-400 font-bold uppercase flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Subscription Plan Tier & Data Retention Setup
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Feature Plan Tier *</label>
                    <select
                      value={form.planTier}
                      onChange={(e) => {
                        const tier = e.target.value as "billing_only" | "billing_accounting";
                        setForm({
                          ...form,
                          planTier: tier,
                          subscriptionFee: tier === "billing_accounting" ? 10000 : 5000,
                        });
                      }}
                      className="w-full bg-[#0b0b0d] border border-emerald-500/40 text-emerald-400 font-bold px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      <option value="billing_only" className="bg-[#0b0b0d]">Option A: Billing + Inventory Only (PKR 5,000/mo)</option>
                      <option value="billing_accounting" className="bg-[#0b0b0d]">Option B: Full Accounting & Ledger (PKR 10,000/mo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Data Retention Period *</label>
                    <select
                      value={form.dataRetentionMonths}
                      onChange={(e) => setForm({ ...form, dataRetentionMonths: Number(e.target.value) })}
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      <option value={6} className="bg-[#0b0b0d]">6 Months Retention (Standard)</option>
                      <option value={12} className="bg-[#0b0b0d]">12 Months / 1 Year Retention</option>
                      <option value={24} className="bg-[#0b0b0d]">24 Months / 2 Years Retention</option>
                      <option value={0} className="bg-[#0b0b0d]">Unlimited / Lifetime Data Retention</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-emerald-500/20">
                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Billing Cycle</label>
                    <select
                      value={form.subscriptionPlan}
                      onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })}
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      <option value="monthly" className="bg-[#0b0b0d]">Monthly Recurring</option>
                      <option value="yearly" className="bg-[#0b0b0d]">Yearly Recurring</option>
                      <option value="custom" className="bg-[#0b0b0d]">Custom Deal</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Subscription Fee (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={form.subscriptionFee}
                      onChange={(e) => setForm({ ...form, subscriptionFee: Number(e.target.value) })}
                      placeholder="5000"
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-emerald-400 font-mono font-bold px-3 py-2.5 text-[1.5rem] outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Initial Access Duration</label>
                    <select
                      value={form.durationMonths}
                      onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      <option value={1} className="bg-[#0b0b0d]">1 Month Access</option>
                      <option value={3} className="bg-[#0b0b0d]">3 Months Access</option>
                      <option value={6} className="bg-[#0b0b0d]">6 Months Access</option>
                      <option value={12} className="bg-[#0b0b0d]">1 Year Access</option>
                    </select>
                  </div>
                </div>
              </div>


              {/* Row 3: Admin Owner Credentials */}
              <div className="border border-[#002bba]/40 bg-[#002bba]/10 p-4 space-y-4">
                <p className="font-accent text-[1.2rem] text-blue-300 font-bold uppercase flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Tenant Admin Login Access Credentials
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Owner Full Name</label>
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="e.g. Tariq Mahmood"
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="e.g. owner@restaurant.com"
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">4-Digit Quick PIN *</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={form.adminPin}
                      onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                      placeholder="1234"
                      className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-emerald-400 font-mono font-bold px-3 py-2.5 text-[1.5rem] outline-none focus:border-[#002bba]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Contact & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Address / Location</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Gulberg III, Lahore"
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                  />
                </div>
              </div>

              {/* Checkbox: Seed starter catalogue */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="createSampleMenu"
                  checked={form.createSampleMenu}
                  onChange={(e) => setForm({ ...form, createSampleMenu: e.target.checked })}
                  className="w-5 h-5 accent-[#002bba] cursor-pointer"
                />
                <label htmlFor="createSampleMenu" className="font-accent text-[1.2rem] text-gray-300 cursor-pointer">
                  Auto-seed starter product menu for <b>{VERTICAL_CONFIGS[form.businessType]?.title}</b>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary py-2.5 px-6 text-[1.3rem] bg-[#0b0b0d] border-[rgba(255,255,255,0.15)] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary py-2.5 px-8 text-[1.3rem] disabled:opacity-50"
                >
                  {submitting ? "Provisioning..." : "Provision Tenant & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Credentials Card Modal */}
      {createdTenant && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-emerald-500/40 w-full max-w-md p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-accent font-extrabold text-[1.5rem] uppercase">
                <Key className="w-5 h-5" />
                <span>Tenant Provisioned & Credentials</span>
              </div>
              <button onClick={() => setCreatedTenant(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.1)] p-4 font-accent text-[1.3rem]">
              <div className="flex justify-between">
                <span className="text-gray-400">Business Name:</span>
                <span className="font-bold text-white">{createdTenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vertical Mode:</span>
                <span className="font-bold text-amber-400 uppercase">{createdTenant.businessType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subscription Fee:</span>
                <span className="font-bold text-emerald-400">PKR {createdTenant.subscriptionFee?.toLocaleString() || 5000}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Login Email:</span>
                <span className="font-bold text-blue-400">{createdTenant.adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quick PIN:</span>
                <span className="font-bold text-emerald-400 text-[1.5rem]">🔑 {createdTenant.adminPin}</span>
              </div>
            </div>

            <p className="text-[1.2rem] text-gray-400">
              Send these credentials to the tenant owner. They can log in at <code>/login</code> with their email or PIN. Access expires on <b>{new Date(createdTenant.expiryDate).toLocaleDateString("en-PK")}</b>.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 btn btn-primary py-3 text-[1.3rem] flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Access Info"}</span>
              </button>
              <button
                onClick={() => setCreatedTenant(null)}
                className="btn btn-secondary py-3 px-6 text-[1.3rem] bg-[#0b0b0d] border-[rgba(255,255,255,0.15)] text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
