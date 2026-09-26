"use client";

import { useState } from "react";
import { X, Building2, UserCheck, CreditCard } from "lucide-react";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";

interface ProvisionTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProvisionTenantModal({ isOpen, onClose, onSuccess }: ProvisionTenantModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("bakery");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [phone, setPhone] = useState("");
  // Not editable in this form yet — sent with their defaults
  const address = "";
  const dataRetentionMonths = 6;
  const subscriptionPlan = "monthly";
  const durationMonths = 1;
  const createSampleMenu = true;
  const [taxRate, setTaxRate] = useState(16.0);
  const [planTier, setPlanTier] = useState<"billing_only" | "billing_accounting">("billing_accounting");
  const [maxBranches, setMaxBranches] = useState(5);
  const [maxStaffUsers, setMaxStaffUsers] = useState(20);
  const [subscriptionFee, setSubscriptionFee] = useState(5000);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          businessType,
          adminName,
          adminEmail,
          adminPin,
          phone,
          address,
          taxRate,
          planTier,
          dataRetentionMonths,
          planLimits: { maxBranches: Number(maxBranches), maxStaffUsers: Number(maxStaffUsers) },
          subscriptionPlan,
          subscriptionFee,
          durationMonths,
          createSampleMenu,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const t = data.tenant || {};
        alert(
          `Tenant '${name}' provisioned successfully!\n\n` +
            `Store code (for PIN login): ${t.code}\n` +
            `Admin email: ${t.adminEmail}\n` +
            (t.tempPassword ? `Temporary password: ${t.tempPassword}\n(shown only once — share it securely)` : "")
        );
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Failed to provision tenant");
      }
    } catch {
      alert("Error provisioning tenant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-[96rem] w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[2rem] font-bold text-gray-900">Provision New Tenant Business</h2>
              <p className="text-[1.2rem] text-muted">Configure business identity, plan limits, and owner admin credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Business Identity & Engine */}
          <div className="space-y-4">
            <h3 className="text-[1.4rem] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> 1. Business Identity & Engine Vertical
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gourmet Foods & Bakery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] focus:ring-2 focus:ring-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Business Engine Vertical *</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] bg-white font-medium focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  {Object.entries(VERTICAL_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner Admin Credentials */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-[1.4rem] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> 2. Owner Account Credentials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Mahmood"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Login Email *</label>
                <input
                  type="email"
                  placeholder="admin@business.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">4-Digit PIN *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] font-mono tracking-widest text-center"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Plan Tier & Limits */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-[1.4rem] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" /> 3. Subscription Plan Tier & Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Plan Tier</label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] bg-white font-medium"
                >
                  <option value="billing_accounting">Billing + Accounting Pro</option>
                  <option value="billing_only">Billing Only (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Monthly Fee (PKR)</label>
                <input
                  type="number"
                  value={subscriptionFee}
                  onChange={(e) => setSubscriptionFee(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] font-bold"
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Max Branches</label>
                <input
                  type="number"
                  value={maxBranches}
                  onChange={(e) => setMaxBranches(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-gray-700 uppercase mb-1">Max Staff Users</label>
                <input
                  type="number"
                  value={maxStaffUsers}
                  onChange={(e) => setMaxStaffUsers(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem]"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border rounded-lg text-[1.4rem] font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[1.4rem] font-bold shadow-md hover:shadow-lg transition"
            >
              {submitting ? "Activating Tenant..." : "🚀 Save & Activate Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
