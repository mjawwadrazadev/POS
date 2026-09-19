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
  ArrowUpRight,
  ExternalLink,
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
} from "lucide-react";

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
  branchCount: number;
  userCount: number;
  productCount: number;
  createdAt: string;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

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
        createSampleMenu: true,
      });

      fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyCredentials() {
    if (!createdTenant) return;
    const text = `🔑 RST POS Access Credentials for ${createdTenant.name}:\n\nBusiness Type: ${createdTenant.businessType.toUpperCase()}\nLogin Email: ${createdTenant.adminEmail}\nQuick PIN: ${createdTenant.adminPin}\nPortal Link: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "All" || t.businessType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Page Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Super Admin — Tenant Provisioning Center
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Register new business tenants, assign vertical engines (Restaurant, Bakery, Pharmacy, etc.), and generate admin credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTenants}
            className="btn btn-secondary py-3 px-4 text-[1.3rem]"
            title="Refresh List"
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Total Tenants</span>
            <Building2 className="w-4 h-4 text-accent" />
          </div>
          <div className="stat-card__value">{tenants.length}</div>
          <div className="stat-card__trend positive">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Businesses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Active Staff Accounts</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="stat-card__value">
            {tenants.reduce((sum, t) => sum + (t.userCount || 0), 0)}
          </div>
          <div className="stat-card__trend positive">
            <span>Staff & Cashiers</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">Managed Product SKUs</span>
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <div className="stat-card__value">
            {tenants.reduce((sum, t) => sum + (t.productCount || 0), 0)}
          </div>
          <div className="stat-card__trend positive">
            <span>Across All Verticals</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__title">System Status</span>
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <div className="stat-card__value text-emerald-400">100% ONLINE</div>
          <div className="stat-card__trend positive">
            <span>Multi-Tenant Isolated</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[22rem] flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tenant name, email, or code..."
            className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
          />
        </div>

        <div className="flex items-center gap-3">
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
              <th>Admin Owner</th>
              <th>Admin Email</th>
              <th>Quick PIN</th>
              <th>Branches</th>
              <th>Staff</th>
              <th>Products</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  Loading tenants from database...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  No business tenants found. Click "Provision New Tenant" to create one.
                </td>
              </tr>
            ) : (
              filteredTenants.map((t) => (
                <tr key={t.id}>
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

                  <td className="font-accent text-bright font-semibold">{t.adminName}</td>

                  <td className="font-accent text-accent font-bold">{t.adminEmail}</td>

                  <td>
                    <span className="bg-base-bright border border-stroke-muted px-2.5 py-1 font-accent font-bold text-emerald-400 text-[1.3rem]">
                      🔑 {t.adminPin}
                    </span>
                  </td>

                  <td className="font-accent text-center font-bold text-bright">{t.branchCount}</td>
                  <td className="font-accent text-center font-bold text-bright">{t.userCount}</td>
                  <td className="font-accent text-center font-bold text-accent">{t.productCount}</td>

                  <td className="text-right">
                    <button
                      onClick={() => {
                        setCreatedTenant({
                          name: t.name,
                          businessType: t.businessType,
                          adminEmail: t.adminEmail,
                          adminPin: t.adminPin,
                          adminName: t.adminName,
                        });
                      }}
                      className="btn btn-secondary py-1 px-3 text-[1.1rem] flex items-center gap-1 ml-auto"
                      title="View Access Credentials"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Credentials</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

              {/* Row 2: Admin Owner Credentials */}
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

              {/* Row 3: Contact & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Tax Rate (%)</label>
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
                  {submitting ? "Provisioning..." : "Provision Tenant"}
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
                <span>Tenant Credentials</span>
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
                <span className="text-gray-400">Login Email:</span>
                <span className="font-bold text-blue-400">{createdTenant.adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quick PIN:</span>
                <span className="font-bold text-emerald-400 text-[1.5rem]">🔑 {createdTenant.adminPin}</span>
              </div>
            </div>

            <p className="text-[1.2rem] text-gray-400">
              Send these credentials to the tenant owner. They can log in at <code>/login</code> with their email or PIN.
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
