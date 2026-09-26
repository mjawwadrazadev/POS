"use client";

import { useCallback, useEffect, useState, use } from "react";
import { TenantFbrPanel } from "@/components/super-admin/TenantFbrPanel";
import { useSessionUser } from "@/components/layout/SessionContext";
import { canPerformPlatformAction } from "@/lib/auth/permissions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  CreditCard,
  Users,
  Activity,
  AlertTriangle,
  Eye,
  KeyRound,
  Printer,
  ShieldAlert,
  Landmark,
} from "lucide-react";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionUser = useSessionUser();
  const canImpersonate = canPerformPlatformAction(sessionUser?.role, "impersonate_tenant");
  const canTerminate = canPerformPlatformAction(sessionUser?.role, "terminate_tenant");
  const canManageFbr = canPerformPlatformAction(sessionUser?.role, "manage_fbr");
  const { id } = use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "staff" | "fbr" | "usage" | "danger">("overview");

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMonths, setPaymentMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<any>(null);
  const [newPin, setNewPin] = useState("");

  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [terminateReason, setTerminateReason] = useState("");

  const fetchTenantDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (data.success) {
        const found = data.tenants.find((t: any) => t.id === id);
        if (found) {
          setTenant(found);
          // Pre-fill the payment form with this tenant's actual subscription fee
          setPaymentAmount(found.subscriptionFee || 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenantDetail();
  }, [fetchTenantDetail]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/super-admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: id,
          amount: paymentAmount,
          monthsAdded: paymentMonths,
          paymentMethod,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowPaymentModal(false);
        fetchTenantDetail();
      } else {
        alert(data.error || "Failed to record payment");
      }
    } catch {
      alert("Error recording payment");
    }
  };

  const handleStartImpersonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonateReason || impersonateReason.length < 5) {
      alert("Please enter a clear reason (at least 5 characters)");
      return;
    }

    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: id, reason: impersonateReason }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = "/pos";
      } else {
        alert(data.error || "Impersonation failed");
      }
    } catch {
      alert("Error starting impersonation");
    }
  };

  const handleSuspendToggle = async (newStatus: "active" | "suspended_manual") => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: "Manual status toggle by Super Admin" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTenantDetail();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Error updating status");
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser || !newPin) return;

    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/reset-user-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStaffUser.id || selectedStaffUser._id,
          newPin,
          reason: "Super Admin support ticket pin reset",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowResetPinModal(false);
        fetchTenantDetail();
      } else {
        alert(data.error || "Failed to reset PIN");
      }
    } catch {
      alert("Error resetting PIN");
    }
  };

  const handleTerminateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTenantName: confirmName, reason: terminateReason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.push("/super-admin/tenants");
      } else {
        alert(data.error || "Failed to terminate tenant");
      }
    } catch {
      alert("Error terminating tenant");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted font-bold">Loading tenant detail...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-16">
        <div className="max-w-[48rem] mx-auto text-center space-y-4">
          <h2 className="text-[2rem] font-bold">Tenant Not Found</h2>
          <Link href="/super-admin/tenants" className="text-accent font-bold underline">
            ← Back to Tenants List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="space-y-4">
          <Link
            href="/super-admin/tenants"
            className="text-[1.2rem] font-bold text-muted hover:text-bright transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tenants Registry
          </Link>

          <div className="bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-[2.4rem] font-black text-bright">{tenant.name}</h1>
                <span className="bg-accent-subtle text-accent border border-accent text-[1.2rem] font-bold px-2.5 py-0.5 rounded uppercase">
                  {tenant.businessType}
                </span>
                <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[1.2rem] font-bold px-2.5 py-0.5 rounded uppercase">
                  {tenant.subscriptionStatus}
                </span>
              </div>
              <p className="text-[1.2rem] text-muted mt-1">
                Owner: <strong>{tenant.adminName}</strong> ({tenant.adminEmail}) · Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {canImpersonate && (
                <button
                  onClick={() => setShowImpersonateModal(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-[1.4rem] flex items-center space-x-2 transition shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>View as Tenant (Impersonate)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5 Tabs Navigation Bar */}
        <div className="border-b border-stroke-muted flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-accent text-accent bg-base-tint"
                : "border-transparent text-muted hover:text-bright"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tab 1: Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "subscription"
                ? "border-accent text-accent bg-base-tint"
                : "border-transparent text-muted hover:text-bright"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Tab 2: Subscription & Payments</span>
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "staff"
                ? "border-accent text-accent bg-base-tint"
                : "border-transparent text-muted hover:text-bright"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tab 3: Staff & Branches</span>
          </button>

          {canManageFbr && (
            <button
              onClick={() => setActiveTab("fbr")}
              className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "fbr"
                  ? "border-accent text-accent bg-base-tint"
                  : "border-transparent text-muted hover:text-bright"
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>FBR Integration{tenant.fbr?.enabled ? " ✓" : ""}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("usage")}
            className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "usage"
                ? "border-accent text-accent bg-base-tint"
                : "border-transparent text-muted hover:text-bright"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Tab 4: Usage & Activity</span>
          </button>

          {canTerminate && (
            <button
              onClick={() => setActiveTab("danger")}
              className={`px-4 py-3 text-[1.4rem] font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "danger"
                  ? "border-rose-500 text-rose-600 bg-rose-950/20"
                  : "border-transparent text-muted hover:text-rose-600"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Tab 5: Danger Zone</span>
            </button>
          )}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-bright text-[1.6rem] border-b border-stroke-muted pb-3">Business Identity Details</h3>
              <div className="space-y-3 text-[1.4rem]">
                <div className="flex justify-between">
                  <span className="text-muted">Business Name:</span>
                  <span className="font-bold text-bright">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Code / Slug:</span>
                  <span className="font-mono text-medium">{tenant.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Vertical Engine:</span>
                  <span className="font-bold text-accent uppercase">{tenant.businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Phone:</span>
                  <span className="text-medium">{tenant.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Address:</span>
                  <span className="text-medium">{tenant.address || "Main Branch"}</span>
                </div>
              </div>
            </div>

            <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-bright text-[1.6rem] border-b border-stroke-muted pb-3">Plan Tier & Limits</h3>
              <div className="space-y-3 text-[1.4rem]">
                <div className="flex justify-between">
                  <span className="text-muted">Selected Plan Tier:</span>
                  <span className="font-bold text-emerald-600">{tenant.planTier === "billing_accounting" ? "Billing + Accounting Pro" : "Standard Billing"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Monthly Price:</span>
                  <span className="font-bold text-bright">PKR {tenant.subscriptionFee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Max Allowed Branches:</span>
                  <span className="font-mono text-bright">5 Branches</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Max Staff Users:</span>
                  <span className="font-mono text-bright">20 Staff Accounts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Data Retention:</span>
                  <span className="font-bold text-medium">{tenant.dataRetentionMonths} Months</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Subscription & Payments */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-bright text-[1.8rem]">Subscription Access & Expiry</h3>
                <p className="text-[1.2rem] text-muted">
                  Current Expiry: <strong>{new Date(tenant.expiryDate).toLocaleDateString()}</strong> ({tenant.daysRemaining} days remaining)
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition shadow-md"
                >
                  💳 Renew Fee / Record Payment
                </button>

                {tenant.subscriptionStatus === "suspended_manual" ? (
                  <button
                    onClick={() => handleSuspendToggle("active")}
                    className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition"
                  >
                    Reactivate Access
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspendToggle("suspended_manual")}
                    className="bg-rose-900/40 hover:bg-rose-900 text-rose-600 border border-rose-700 font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition"
                  >
                    Suspend Access
                  </button>
                )}
              </div>
            </div>

            {/* Standalone Payment History Logs Table */}
            <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-bright text-[1.6rem]">Recorded Payment History Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[1.4rem] border-collapse">
                  <thead>
                    <tr className="bg-base border-b border-stroke-muted text-muted text-[1.2rem] font-bold uppercase">
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Months Added</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke-muted">
                    {(tenant.paymentHistory || []).map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-accent-subtle">
                        <td className="p-3 text-medium">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-bright">PKR {p.amount?.toLocaleString()}</td>
                        <td className="p-3 text-medium">{p.monthsAdded || 1} Month(s)</td>
                        <td className="p-3 text-muted text-[1.2rem]">{p.notes || "Subscription renewal"}</td>
                        <td className="p-3 text-right">
                          <a
                            href={`/api/super-admin/invoices/${p._id || tenant.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[1.2rem] font-bold text-accent hover:underline inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Invoice
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Staff & Branches */}
        {activeTab === "staff" && (
          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-bright text-[1.6rem]">Tenant Staff & Admin Accounts</h3>
            <div className="space-y-3">
              <div className="p-4 bg-base border border-stroke-muted rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold text-bright">{tenant.adminName} (Tenant Owner Admin)</div>
                  <div className="text-[1.2rem] text-muted">{tenant.adminEmail} · Store code: <span className="font-mono">{tenant.code}</span></div>
                </div>
                <button
                  disabled={!tenant.adminUserId}
                  onClick={() => {
                    setSelectedStaffUser({ id: tenant.adminUserId, name: tenant.adminName });
                    setShowResetPinModal(true);
                  }}
                  className="bg-accent hover:bg-accent-hover text-white font-bold px-3 py-1.5 rounded-lg text-[1.2rem] flex items-center space-x-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset PIN / Password</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FBR Integration */}
        {canManageFbr && activeTab === "fbr" && <TenantFbrPanel tenantId={id} />}

        {/* Tab 4: Usage & Activity */}
        {activeTab === "usage" && (
          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-bright text-[1.6rem]">Tenant POS Activity & Impersonation</h3>
            <p className="text-[1.4rem] text-medium">
              Inspect tenant store view directly to assist with setup, troubleshooting, or menu configuration.
            </p>
            {canImpersonate && (
              <button
                onClick={() => setShowImpersonateModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-[1.4rem] flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Launch "View as Tenant" Mode</span>
              </button>
            )}
          </div>
        )}

        {/* Tab 5: Danger Zone */}
        {canTerminate && activeTab === "danger" && (
          <div className="bg-rose-950/20 border border-rose-900/60 rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-black text-[1.8rem]">Danger Zone — Irreversible Administrative Actions</h3>
            </div>

            <div className="p-4 bg-base-tint border border-rose-900/40 rounded-xl flex justify-between items-center">
              <div>
                <h4 className="font-bold text-bright text-[1.4rem]">Terminate Tenant Business</h4>
                <p className="text-[1.2rem] text-muted">Full offboarding flow. Deactivates all staff users and locks access permanently.</p>
              </div>
              <button
                onClick={() => setShowTerminateModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-[1.4rem]"
              >
                Terminate Tenant
              </button>
            </div>
          </div>
        )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-stroke-muted text-bright max-w-[48rem] w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-[1.8rem] border-b border-stroke-muted pb-3">Record Subscription Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Months Added</label>
                <input
                  type="number"
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="stripe">Stripe Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Receipt #, bank reference"
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-base hover:bg-accent-subtle text-medium rounded-lg text-[1.4rem] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[1.4rem] font-bold"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impersonation Reason Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-stroke-muted text-bright max-w-[48rem] w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-[1.8rem] border-b border-stroke-muted pb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600" /> Start "View as Tenant" Session
            </h3>
            <form onSubmit={handleStartImpersonation} className="space-y-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-amber-600 uppercase mb-1">
                  Mandatory Reason for Impersonation *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Assisting customer with thermal receipt printer configuration ticket #402"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <p className="text-[1.2rem] text-muted">
                Session is hard capped at 30 minutes and logged in AuditLog for security safety.
              </p>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImpersonateModal(false)}
                  className="px-4 py-2 bg-base hover:bg-accent-subtle text-medium rounded-lg text-[1.4rem] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[1.4rem] font-bold"
                >
                  Enter Impersonation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-stroke-muted text-bright max-w-[48rem] w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-[1.8rem] border-b border-stroke-muted pb-3">Reset Staff User PIN</h3>
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">New 4-Digit PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright font-mono tracking-widest text-center"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="px-4 py-2 bg-base hover:bg-accent-subtle text-medium rounded-lg text-[1.4rem] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-[1.4rem] font-bold"
                >
                  Reset PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-rose-900 text-bright max-w-[48rem] w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-[1.8rem] border-b border-stroke-muted pb-3 text-rose-600">Confirm Tenant Offboarding & Termination</h3>
            <form onSubmit={handleTerminateTenant} className="space-y-4">
              <p className="text-[1.2rem] text-medium">
                Type <strong>{tenant.name}</strong> to confirm permanent termination:
              </p>

              <input
                type="text"
                placeholder={tenant.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                required
              />

              <textarea
                rows={2}
                placeholder="Reason for offboarding/termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                required
              />

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTerminateModal(false)}
                  className="px-4 py-2 bg-base hover:bg-accent-subtle text-medium rounded-lg text-[1.4rem] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[1.4rem] font-bold"
                >
                  Confirm Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
