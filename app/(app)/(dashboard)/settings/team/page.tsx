"use client";

import { useEffect, useState } from "react";
import { Users, Building2, LayoutGrid, Plus, RefreshCw, CheckCircle2, AlertCircle, Trash2, KeyRound } from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";
import { useSessionUser } from "@/components/layout/SessionContext";

interface StaffUser {
  _id: string;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "cashier";
  isActive: boolean;
  branchId?: string;
  baseSalary?: number;
}

interface BranchRow {
  _id: string;
  name: string;
  code: string;
  city: string;
  isMain: boolean;
}

interface TableRow {
  _id: string;
  label: string;
  capacity: number;
  status: string;
}

interface ResetRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  createdAt: string;
}

/** Who is being reset, and (when it came from the forgot-password page) which request it answers */
type ResetTarget = { userId: string; name: string; requestId?: string };

type Tab = "team" | "branches" | "tables";

async function api(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

export default function TeamSettingsPage() {
  const [tab, setTab] = useState<Tab>("team");
  const sessionRole: string = useSessionUser()?.role || "";
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [resetForm, setResetForm] = useState({ password: "", pin: "" });
  const [resetting, setResetting] = useState(false);

  // New staff form
  const [staffForm, setStaffForm] = useState({ fullName: "", email: "", pin: "", role: "cashier", branchId: "", baseSalary: "" });
  // New branch form
  const [branchForm, setBranchForm] = useState({ name: "", code: "", city: "", phone: "", address: "" });
  // New table form
  const [tableForm, setTableForm] = useState({ label: "", capacity: 4 });

  const isAdmin = sessionRole === "admin";

  async function loadAll() {
    setLoading(true);
    try {
      if (sessionRole === "admin") {
        api("/api/staff-reset-requests")
          .then((r) => setResetRequests(r.requests || []))
          .catch(() => setResetRequests([]));
      }
      const [u, b, t] = await Promise.all([
        api("/api/users").catch(() => ({ users: [] })),
        api("/api/branches"),
        api("/api/tables").catch(() => ({ tables: [] })),
      ]);
      setUsers(u.users || []);
      setBranches(b.branches || []);
      setTables(t.tables || []);
    } catch (err: any) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    if (type === "ok") setTimeout(() => setMessage(null), 6000);
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await api("/api/users", "POST", {
        ...staffForm,
        branchId: staffForm.branchId || undefined,
        baseSalary: staffForm.baseSalary === "" ? undefined : Number(staffForm.baseSalary),
      });
      flash(
        "ok",
        `${data.user.fullName} added.` +
          (data.tempPassword ? ` Temporary password: ${data.tempPassword} (shown once — share it securely).` : "")
      );
      setStaffForm({ fullName: "", email: "", pin: "", role: "cashier", branchId: "", baseSalary: "" });
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  async function updateStaff(userId: string, changes: Record<string, unknown>) {
    try {
      const data = await api("/api/users", "PATCH", { userId, ...changes });
      flash("ok", data.message);
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  function openReset(target: ResetTarget) {
    setResetForm({ password: "", pin: "" });
    setResetTarget(target);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    const password = resetForm.password.trim();
    const pin = resetForm.pin.trim();
    if (!password && !pin) {
      flash("err", "Enter a new password, a new PIN, or both.");
      return;
    }
    setResetting(true);
    try {
      const data = resetTarget.requestId
        ? await api(`/api/staff-reset-requests/${resetTarget.requestId}`, "POST", {
            newPassword: password || undefined,
            newPin: pin || undefined,
          })
        : await api("/api/users", "PATCH", {
            userId: resetTarget.userId,
            ...(password ? { password } : {}),
            ...(pin ? { pin } : {}),
          });
      flash("ok", `${data.message}. Give the new details to ${resetTarget.name} in person.`);
      setResetTarget(null);
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    } finally {
      setResetting(false);
    }
  }

  async function dismissRequest(requestId: string) {
    if (!confirm("Dismiss this reset request without changing anything?")) return;
    try {
      await api(`/api/staff-reset-requests/${requestId}`, "POST", { dismiss: true });
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/branches", "POST", branchForm);
      flash("ok", `Branch '${branchForm.name}' created.`);
      setBranchForm({ name: "", code: "", city: "", phone: "", address: "" });
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/tables", "POST", { action: "create", ...tableForm });
      flash("ok", `Table '${tableForm.label}' added.`);
      setTableForm({ label: "", capacity: 4 });
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  async function handleDeleteTable(tableId: string) {
    if (!confirm("Remove this table?")) return;
    try {
      await api("/api/tables", "POST", { action: "delete", tableId });
      loadAll();
    } catch (err: any) {
      flash("err", err.message);
    }
  }

  const branchName = (id?: string) => branches.find((b) => b._id === id)?.name || "Main / Any";

  return (
    <div className="space-y-6">
      <PageActions>
        <button type="button" onClick={loadAll} className="btn btn-secondary py-2.5 px-4 text-[1.2rem] flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </PageActions>

      {message && (
        <div
          className={`p-3 border font-accent text-[1.3rem] flex items-start gap-2 ${
            message.type === "ok"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          {message.type === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {isAdmin && resetRequests.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
          <div className="font-accent font-bold uppercase text-amber-500 text-[1.3rem] flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Password reset requests ({resetRequests.length})
          </div>
          <p className="text-[1.3rem] text-medium">
            These staff members used &quot;Forgot password&quot;. Set a new password or PIN and give it to them in person.
          </p>
          <ul className="divide-y divide-stroke-muted">
            {resetRequests.map((r) => (
              <li key={r.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[1.3rem]">
                <span>
                  <b className="text-bright">{r.userName}</b>{" "}
                  <span className="text-muted">
                    ({r.userRole}) · {r.userEmail} · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary py-1 px-3 text-[1.1rem]"
                    onClick={() => openReset({ userId: r.userId, name: r.userName, requestId: r.id })}
                  >
                    Reset now
                  </button>
                  <button type="button" className="btn btn-secondary py-1 px-3 text-[1.1rem]" onClick={() => dismissRequest(r.id)}>
                    Dismiss
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 flex-wrap font-accent text-[1.3rem]">
        {([
          ["team", "Team", Users],
          ["branches", "Branches", Building2],
          ["tables", "Tables", LayoutGrid],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 border flex items-center gap-2 font-bold uppercase ${
              tab === key ? "bg-[#002bba] text-white border-[#819ffe]" : "border-stroke-muted text-muted"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── TEAM ─── */}
      {tab === "team" && (
        <div className="space-y-6">
          {isAdmin && (
            <form onSubmit={handleAddStaff} className="bg-base-bright border border-stroke-muted p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Full name *</label>
                <input className="form-input" required value={staffForm.fullName} onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
              </div>
              <div>
                <label className="form-label">4-digit PIN *</label>
                <input
                  className="form-input font-mono"
                  required
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={staffForm.pin}
                  onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Branch</label>
                <select className="form-select" value={staffForm.branchId} onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}>
                  <option value="">Main branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Monthly base salary (PKR)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={staffForm.baseSalary}
                  onChange={(e) => setStaffForm({ ...staffForm, baseSalary: e.target.value })}
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="btn btn-primary py-2.5 px-6 text-[1.3rem] flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Staff Member
                </button>
              </div>
            </form>
          )}

          <div className="bg-base-bright border border-stroke-muted overflow-x-auto">
            <table className="w-full text-[1.3rem]">
              <thead>
                <tr className="text-left text-muted font-accent uppercase text-[1.1rem]">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Salary</th>
                  <th className="p-3">Status</th>
                  {isAdmin && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-stroke-muted">
                    <td className="p-3 font-bold text-bright">{u.fullName}</td>
                    <td className="p-3 text-muted">{u.email}</td>
                    <td className="p-3">
                      {isAdmin ? (
                        <select
                          className="form-select py-1"
                          value={u.role}
                          onChange={(e) => updateStaff(u._id, { role: e.target.value })}
                        >
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="uppercase">{u.role}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{branchName(u.branchId)}</td>
                    <td className="p-3">
                      {isAdmin ? (
                        <input
                          className="form-input py-1 w-32"
                          type="number"
                          min={0}
                          defaultValue={u.baseSalary ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== "" && Number(v) !== (u.baseSalary ?? -1)) updateStaff(u._id, { baseSalary: Number(v) });
                          }}
                        />
                      ) : (
                        u.baseSalary ? `PKR ${u.baseSalary.toLocaleString()}` : "—"
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${u.isActive ? "badge-success" : "badge-error"}`}>{u.isActive ? "ACTIVE" : "INACTIVE"}</span>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="btn btn-secondary py-1 px-3 text-[1.1rem]"
                          onClick={() => openReset({ userId: u._id, name: u.fullName })}
                        >
                          Reset login
                        </button>
                        <button
                          type="button"
                          className={`btn py-1 px-3 text-[1.1rem] ${u.isActive ? "btn-danger" : "btn-success"}`}
                          onClick={() => updateStaff(u._id, { isActive: !u.isActive })}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted">No staff visible for your role.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── BRANCHES ─── */}
      {tab === "branches" && (
        <div className="space-y-6">
          {isAdmin && (
            <form onSubmit={handleAddBranch} className="bg-base-bright border border-stroke-muted p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Branch name *</label>
                <input className="form-input" required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Code * (e.g. LHR-02)</label>
                <input className="form-input uppercase" required value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input className="form-input" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Address</label>
                <input className="form-input" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="btn btn-primary py-2.5 px-6 text-[1.3rem] flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Branch
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div key={b._id} className="bg-base-bright border border-stroke-muted p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-bright text-[1.4rem]">{b.name}</span>
                  {b.isMain && <span className="badge badge-accent">MAIN</span>}
                </div>
                <div className="font-mono text-muted text-[1.2rem]">{b.code}</div>
                <div className="text-muted text-[1.2rem]">{b.city}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TABLES ─── */}
      {tab === "tables" && (
        <div className="space-y-6">
          <form onSubmit={handleAddTable} className="bg-base-bright border border-stroke-muted p-5 flex flex-wrap items-end gap-4">
            <div>
              <label className="form-label">Table label *</label>
              <input className="form-input" required value={tableForm.label} onChange={(e) => setTableForm({ ...tableForm, label: e.target.value })} placeholder="Table 07" />
            </div>
            <div>
              <label className="form-label">Seats</label>
              <input
                className="form-input w-24"
                type="number"
                min={1}
                max={50}
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
              />
            </div>
            <button type="submit" className="btn btn-primary py-2.5 px-6 text-[1.3rem] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Table
            </button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map((t) => (
              <div key={t._id} className="bg-base-bright border border-stroke-muted p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-bright">{t.label}</span>
                  <button type="button" onClick={() => handleDeleteTable(t._id)} className="text-error" aria-label={`Remove ${t.label}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-muted text-[1.2rem]">{t.capacity} seats · {t.status}</div>
              </div>
            ))}
            {!loading && tables.length === 0 && <div className="text-muted col-span-full">No tables yet.</div>}
          </div>
        </div>
      )}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
          <form onSubmit={handleReset} className="bg-base-tint border border-stroke-muted w-full max-w-md p-6 space-y-4">
            <h3 className="font-extrabold text-[1.8rem] text-bright flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-accent" /> Reset login for {resetTarget.name}
            </h3>
            <p className="text-[1.3rem] text-medium">Fill in one or both. Leave a field empty to keep it unchanged.</p>
            <div>
              <label className="form-label">New password (min 8 characters)</label>
              <input
                className="form-input"
                type="text"
                autoComplete="new-password"
                minLength={8}
                value={resetForm.password}
                onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">New 4-digit PIN</label>
              <input
                className="form-input font-mono tracking-widest"
                inputMode="numeric"
                maxLength={4}
                value={resetForm.pin}
                onChange={(e) => setResetForm((f) => ({ ...f, pin: e.target.value.replace(/[^0-9]/g, "") }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary py-2 px-4" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
              <button type="submit" disabled={resetting} className="btn btn-primary py-2 px-4">
                {resetting ? "Saving..." : "Reset"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
