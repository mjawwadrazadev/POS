"use client";

import { useEffect, useState } from "react";
import { Presentation, Plus, RefreshCw, AlertTriangle, X, CheckCircle2, Store } from "lucide-react";
import { useSessionUser } from "@/components/layout/SessionContext";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { CredentialsBlock, DemoList, DemoRecord, DemoStatsCards } from "@/components/super-admin/DemoWidgets";

const inputCls =
  "w-full px-3.5 py-2.5 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright focus:ring-2 focus:ring-accent focus:outline-none";
const labelCls = "block text-[1.2rem] font-bold text-muted uppercase mb-1";

const EMPTY_FORM = { businessType: "restaurant", clientName: "", clientBusinessName: "", clientPhone: "", clientCity: "", notes: "" };

export default function DemoDeskPage() {
  const me = useSessionUser();
  const isAgent = me?.role === "platform_agent";
  const [demos, setDemos] = useState<DemoRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<DemoRecord | null>(null);

  // Admins see their own demos here; everyone's demos are on Agent Performance
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/demos${isAgent ? "" : "?agentId=me"}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not load demos (HTTP ${res.status})`);
      setDemos(data.demos || []);
      setStats(data.stats || null);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (me) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/super-admin/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create demo");
      setShowForm(false);
      setForm(EMPTY_FORM);
      setCreated(data.demo);
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
            <Presentation className="w-6 h-6 text-accent" />
            {isAgent ? "My Demos" : "Demo Desk"}
          </h1>
          <p className="text-[1.4rem] text-muted mt-1">
            Create a demo store for a client. It works for 24 hours, then the store and everything done in it is deleted —
            your report stays.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="bg-base hover:bg-accent-subtle border border-stroke-medium text-bright font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setFormError("");
              setShowForm(true);
            }}
            className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Demo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-4 rounded-xl text-[1.4rem] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {stats && <DemoStatsCards stats={stats} />}

      <DemoList demos={demos} loading={loading} onChanged={load} canManage />

      {/* New demo form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={submit}
            className="bg-base-tint border border-stroke-muted rounded-2xl max-w-[60rem] w-full p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex justify-between items-center border-b border-stroke-muted pb-3">
              <h2 className="text-[2rem] font-bold text-bright flex items-center gap-2">
                <Store className="w-5 h-5 text-accent" /> New 24-Hour Demo
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="icon-btn text-muted hover:text-bright">
                <X className="w-[1.8rem] h-[1.8rem]" />
              </button>
            </div>

            <div>
              <label className={labelCls}>Business Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(VERTICAL_CONFIGS) as BusinessType[]).map((bt) => (
                  <button
                    type="button"
                    key={bt}
                    onClick={() => setForm({ ...form, businessType: bt })}
                    className={`p-2.5 rounded-xl border text-[1.3rem] font-bold transition ${
                      form.businessType === bt
                        ? "border-accent bg-accent-subtle text-accent"
                        : "border-stroke-muted text-bright hover:border-stroke-medium"
                    }`}
                  >
                    {VERTICAL_CONFIGS[bt].title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Client Name *</label>
                <input className={inputCls} required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Business Name *</label>
                <input
                  className={inputCls}
                  required
                  value={form.clientBusinessName}
                  onChange={(e) => setForm({ ...form, clientBusinessName: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Client Phone</label>
                <input className={inputCls} value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>City / Area</label>
                <input className={inputCls} value={form.clientCity} onChange={(e) => setForm({ ...form, clientCity: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={inputCls}
                rows={2}
                placeholder="Current system, number of counters, what they care about…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
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
                {saving ? "Creating demo store…" : "Create Demo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Login details of the demo just created */}
      {created?.credentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-stroke-muted rounded-2xl max-w-[52rem] w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[2rem] font-bold text-bright">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Demo store ready
            </div>
            <p className="text-[1.4rem] text-muted">
              <b className="text-bright">{created.clientBusinessName}</b> ({VERTICAL_CONFIGS[created.businessType as BusinessType]?.title})
              works until <b className="text-bright">{new Date(created.expiresAt).toLocaleString()}</b>.
            </p>
            <CredentialsBlock demo={created} />
            <button
              onClick={() => setCreated(null)}
              className="w-full bg-accent hover:bg-accent-hover text-white font-bold px-5 py-2.5 rounded-xl text-[1.4rem]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
