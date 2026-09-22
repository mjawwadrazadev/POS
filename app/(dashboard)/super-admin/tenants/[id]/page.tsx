"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  CreditCard,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  KeyRound,
  Printer,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { ProvisionTenantModal } from "@/components/super-admin/ProvisionTenantModal";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "staff" | "usage" | "danger">("overview");
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(5000);
  const [paymentMonths, setPaymentMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<any>(null);
  const [newPin, setNewPin] = useState("1234");

  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [terminateReason, setTerminateReason] = useState("");

  const fetchTenantDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (data.success) {
        const found = data.tenants.find((t: any) => t.id === id);
        if (found) setTenant(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantDetail();
  }, [id]);

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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      alert("Error terminating tenant");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-slate-400 font-bold">Loading tenant detail...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h2 className="text-xl font-bold">Tenant Not Found</h2>
          <Link href="/super-admin/tenants" className="text-blue-400 font-bold underline">
            ← Back to Tenants List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SuperAdminHeader onOpenNewTenantModal={() => setShowProvisionModal(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back Link & Header */}
        <div className="space-y-4">
          <Link
            href="/super-admin/tenants"
            className="text-xs font-bold text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tenants Registry
          </Link>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-white">{tenant.name}</h1>
                <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  {tenant.businessType}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  {tenant.subscriptionStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Owner: <strong>{tenant.adminName}</strong> ({tenant.adminEmail}) · Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowImpersonateModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2 transition shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span>View as Tenant (Impersonate)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Tabs Navigation Bar */}
        <div className="border-b border-slate-800 flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tab 1: Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "subscription"
                ? "border-blue-500 text-blue-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Tab 2: Subscription & Payments</span>
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "staff"
                ? "border-blue-500 text-blue-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tab 3: Staff & Branches</span>
          </button>

          <button
            onClick={() => setActiveTab("usage")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "usage"
                ? "border-blue-500 text-blue-400 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Tab 4: Usage & Activity</span>
          </button>

          <button
            onClick={() => setActiveTab("danger")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "danger"
                ? "border-rose-500 text-rose-400 bg-rose-950/20"
                : "border-transparent text-slate-400 hover:text-rose-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Tab 5: Danger Zone</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Business Identity Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Business Name:</span>
                  <span className="font-bold text-white">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Code / Slug:</span>
                  <span className="font-mono text-slate-300">{tenant.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vertical Engine:</span>
                  <span className="font-bold text-blue-400 uppercase">{tenant.businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-300">{tenant.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="text-slate-300">{tenant.address || "Main Branch"}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Plan Tier & Limits</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Plan Tier:</span>
                  <span className="font-bold text-emerald-400">{tenant.planTier === "billing_accounting" ? "Billing + Accounting Pro" : "Standard Billing"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Price:</span>
                  <span className="font-bold text-white">PKR {tenant.subscriptionFee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Allowed Branches:</span>
                  <span className="font-mono text-slate-200">5 Branches</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Staff Users:</span>
                  <span className="font-mono text-slate-200">20 Staff Accounts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Retention:</span>
                  <span className="font-bold text-slate-300">{tenant.dataRetentionMonths} Months</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Subscription & Payments */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-lg">Subscription Access & Expiry</h3>
                <p className="text-xs text-slate-400">
                  Current Expiry: <strong>{new Date(tenant.expiryDate).toLocaleDateString()}</strong> ({tenant.daysRemaining} days remaining)
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md"
                >
                  💳 Renew Fee / Record Payment
                </button>

                {tenant.subscriptionStatus === "suspended_manual" ? (
                  <button
                    onClick={() => handleSuspendToggle("active")}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition"
                  >
                    Reactivate Access
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspendToggle("suspended_manual")}
                    className="bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold px-4 py-2.5 rounded-xl text-sm transition"
                  >
                    Suspend Access
                  </button>
                )}
              </div>
            </div>

            {/* Standalone Payment History Logs Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base">Recorded Payment History Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase">
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Months Added</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(tenant.paymentHistory || []).map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/60">
                        <td className="p-3 text-slate-300">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-white">PKR {p.amount?.toLocaleString()}</td>
                        <td className="p-3 text-slate-300">{p.monthsAdded || 1} Month(s)</td>
                        <td className="p-3 text-slate-400 text-xs">{p.notes || "Subscription renewal"}</td>
                        <td className="p-3 text-right">
                          <a
                            href={`/api/super-admin/invoices/${p._id || tenant.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Tenant Staff & Admin Accounts</h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{tenant.adminName} (Tenant Owner Admin)</div>
                  <div className="text-xs text-slate-400">{tenant.adminEmail} · Current PIN: {tenant.adminPin}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStaffUser({ id: id, name: tenant.adminName });
                    setShowResetPinModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset PIN / Password</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Usage & Activity */}
        {activeTab === "usage" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Tenant POS Activity & Impersonation</h3>
            <p className="text-sm text-slate-300">
              Inspect tenant store view directly to assist with setup, troubleshooting, or menu configuration.
            </p>
            <button
              onClick={() => setShowImpersonateModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Launch "View as Tenant" Mode</span>
            </button>
          </div>
        )}

        {/* Tab 5: Danger Zone */}
        {activeTab === "danger" && (
          <div className="bg-rose-950/20 border border-rose-900/60 rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-black text-lg">Danger Zone — Irreversible Administrative Actions</h3>
            </div>

            <div className="p-4 bg-slate-900 border border-rose-900/40 rounded-xl flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-sm">Terminate Tenant Business</h4>
                <p className="text-xs text-slate-400">Full offboarding flow. Deactivates all staff users and locks access permanently.</p>
              </div>
              <button
                onClick={() => setShowTerminateModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-sm"
              >
                Terminate Tenant
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Record Subscription Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Months Added</label>
                <input
                  type="number"
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="stripe">Stripe Card</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold"
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
          <div className="bg-slate-900 border border-slate-800 text-white max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" /> Start "View as Tenant" Session
            </h3>
            <form onSubmit={handleStartImpersonation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase mb-1">
                  Mandatory Reason for Impersonation *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Assisting customer with thermal receipt printer configuration ticket #402"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <p className="text-xs text-slate-400">
                Session is hard capped at 30 minutes and logged in AuditLog for security safety.
              </p>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImpersonateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold"
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
          <div className="bg-slate-900 border border-slate-800 text-white max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Reset Staff User PIN</h3>
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New 4-Digit PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono tracking-widest text-center"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold"
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
          <div className="bg-slate-900 border border-rose-900 text-white max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-800 pb-3 text-rose-400">Confirm Tenant Offboarding & Termination</h3>
            <form onSubmit={handleTerminateTenant} className="space-y-4">
              <p className="text-xs text-slate-300">
                Type <strong>{tenant.name}</strong> to confirm permanent termination:
              </p>

              <input
                type="text"
                placeholder={tenant.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                required
              />

              <textarea
                rows={2}
                placeholder="Reason for offboarding/termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                required
              />

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTerminateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold"
                >
                  Confirm Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchTenantDetail}
      />
    </div>
  );
}
