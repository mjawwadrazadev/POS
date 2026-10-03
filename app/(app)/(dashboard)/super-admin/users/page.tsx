"use client";

import { useEffect, useState } from "react";
import { UserCog, Plus, RefreshCw, AlertTriangle, X, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { useSessionUser } from "@/components/layout/SessionContext";
import { ROLE_LABELS } from "@/lib/auth/permissions";

type PlatformUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  phone: string;
  territory: string;
  commissionRate: number | null;
  createdAt: string;
};

const ASSIGNABLE: { value: string; label: string; hint: string }[] = [
  { value: "platform_admin", label: "Admin", hint: "Same powers as the Super Admin" },
  { value: "platform_agent", label: "Sales Agent", hint: "Creates 24-hour demo stores for clients" },
  { value: "platform_support", label: "Platform Support", hint: "Support desk, leads, payments" },
];

const ROLE_BADGE: Record<string, string> = {
  super_admin: "text-purple-600 border-purple-500/30 bg-purple-500/10",
  platform_admin: "text-blue-600 border-blue-500/30 bg-blue-500/10",
  platform_agent: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  platform_support: "text-amber-600 border-amber-500/30 bg-amber-500/10",
};

const inputCls =
  "w-full px-3.5 py-2.5 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright focus:ring-2 focus:ring-accent focus:outline-none";
const labelCls = "block text-[1.2rem] font-bold text-muted uppercase mb-1";

const EMPTY_FORM = { fullName: "", email: "", role: "platform_agent", password: "", phone: "", territory: "", commissionRate: "" };

export default function UserManagementPage() {
  const me = useSessionUser();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not load users (HTTP ${res.status})`);
      setUsers(data.users || []);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (u: PlatformUser) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      password: "",
      phone: u.phone,
      territory: u.territory,
      commissionRate: u.commissionRate == null ? "" : String(u.commissionRate),
    });
    setFormError("");
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName,
        role: form.role,
        phone: form.phone,
        territory: form.territory,
        commissionRate: form.role === "platform_agent" ? form.commissionRate : "",
      };
      if (!editing) {
        body.email = form.email;
        if (form.password) body.password = form.password;
      }
      const res = await fetch(editing ? `/api/super-admin/users/${editing.id}` : "/api/super-admin/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save user");
      setShowForm(false);
      if (data.tempPassword) setCredential({ email: data.user.email, password: data.tempPassword });
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const patch = async (u: PlatformUser, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      const res = await fetch(`/api/super-admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update user");
      if (data.tempPassword) setCredential({ email: u.email, password: data.tempPassword });
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const counts = users.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {});
  const tabs = [
    { value: "all", label: "All", count: users.length },
    { value: "platform_admin", label: "Admins", count: counts.platform_admin || 0 },
    { value: "platform_agent", label: "Sales Agents", count: counts.platform_agent || 0 },
    { value: "platform_support", label: "Support", count: counts.platform_support || 0 },
  ];
  const shown = filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-accent" />
            User Management
          </h1>
          <p className="text-[1.4rem] text-muted mt-1">
            Platform staff accounts: Admins (full access), Sales Agents (demo desk) and Support.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="bg-base hover:bg-accent-subtle border border-stroke-medium text-bright font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreate}
            className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {credential && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-[1.4rem] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-2 text-bright">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Temporary password for <b>{credential.email}</b>:{" "}
              <code className="font-mono font-bold bg-base px-2 py-0.5 rounded">{credential.password}</code>
              <div className="text-[1.2rem] text-muted">Shown once. Share it securely; they log in at /super-admin/login.</div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigator.clipboard?.writeText(credential.password)}
              className="border border-stroke-medium px-3 py-1.5 rounded-lg text-[1.2rem] font-bold text-bright flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button onClick={() => setCredential(null)} className="icon-btn text-muted hover:text-bright">
              <X className="w-[1.6rem] h-[1.6rem]" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-2 border-b border-stroke-muted">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-4 py-3 font-bold text-[1.4rem] border-b-2 transition ${
              filter === t.value ? "border-accent text-accent" : "border-transparent text-muted hover:text-bright"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-4 rounded-xl text-[1.4rem] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-base-tint border border-stroke-muted rounded-2xl overflow-x-auto">
        <table className="w-full text-[1.4rem] min-w-[80rem]">
          <thead>
            <tr className="bg-base border-b border-stroke-muted text-left text-[1.2rem] uppercase text-muted">
              <th className="p-4">Name</th>
              <th className="p-4">Role</th>
              <th className="p-4">Phone / Area</th>
              <th className="p-4">Commission</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke-muted">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">Loading users…</td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">No users here yet.</td>
              </tr>
            ) : (
              shown.map((u) => {
                const isOwner = u.role === "super_admin";
                const isSelf = u.id === me?.userId;
                return (
                  <tr key={u.id} className={u.isActive ? "" : "opacity-60"}>
                    <td className="p-4">
                      <div className="font-bold text-bright">
                        {u.fullName} {isSelf && <span className="text-muted font-normal">(you)</span>}
                      </div>
                      <div className="text-[1.2rem] text-muted">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[1.1rem] border ${ROLE_BADGE[u.role] || ""}`}>
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </span>
                    </td>
                    <td className="p-4 text-bright">
                      {u.phone || "—"}
                      {u.territory && <div className="text-[1.2rem] text-muted">{u.territory}</div>}
                    </td>
                    <td className="p-4 text-bright">{u.role === "platform_agent" && u.commissionRate != null ? `${u.commissionRate}%` : "—"}</td>
                    <td className="p-4">
                      <span className={`font-bold text-[1.2rem] ${u.isActive ? "text-emerald-600" : "text-red-500"}`}>
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="p-4">
                      {isOwner ? (
                        <div className="text-right text-[1.2rem] text-muted">Owner account</div>
                      ) : (
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => openEdit(u)}
                            className="border border-stroke-medium px-3 py-1.5 rounded-lg text-[1.2rem] font-bold text-bright hover:bg-accent-subtle"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => patch(u, { resetPassword: true }, `Generate a new temporary password for ${u.email}?`)}
                            className="border border-stroke-medium px-3 py-1.5 rounded-lg text-[1.2rem] font-bold text-bright hover:bg-accent-subtle flex items-center gap-1"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Reset
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() =>
                                patch(
                                  u,
                                  { isActive: !u.isActive },
                                  u.isActive ? `Disable ${u.fullName}? They will be signed out immediately.` : undefined
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-[1.2rem] font-bold border ${
                                u.isActive
                                  ? "border-red-500/40 text-red-600 hover:bg-red-500/10"
                                  : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                            >
                              {u.isActive ? "Disable" : "Enable"}
                            </button>
                          )}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={submit}
            className="bg-base-tint border border-stroke-muted rounded-2xl max-w-[56rem] w-full p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex justify-between items-center border-b border-stroke-muted pb-3">
              <h2 className="text-[2rem] font-bold text-bright">{editing ? "Edit User" : "Add Platform User"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="icon-btn text-muted hover:text-bright">
                <X className="w-[1.8rem] h-[1.8rem]" />
              </button>
            </div>

            <div>
              <label className={labelCls}>Role *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ASSIGNABLE.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    disabled={!!editing && editing.id === me?.userId}
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`text-left p-3 rounded-xl border transition ${
                      form.role === r.value ? "border-accent bg-accent-subtle" : "border-stroke-muted hover:border-stroke-medium"
                    }`}
                  >
                    <div className="font-bold text-bright text-[1.4rem]">{r.label}</div>
                    <div className="text-[1.15rem] text-muted">{r.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Login Email *</label>
                <input
                  className={inputCls}
                  type="email"
                  required
                  disabled={!!editing}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>City / Area</label>
                <input className={inputCls} value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} />
              </div>
              {form.role === "platform_agent" && (
                <div>
                  <label className={labelCls}>Commission (%)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                  />
                </div>
              )}
              {!editing && (
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    className={inputCls}
                    type="password"
                    minLength={8}
                    placeholder="Leave empty to generate one"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              )}
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-xl text-[1.3rem]">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-[1.4rem] font-bold text-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-[1.4rem]"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
