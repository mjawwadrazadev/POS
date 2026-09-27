"use client";

import { useEffect, useState } from "react";
import { Inbox, Mail, Phone, AlertTriangle, RefreshCw, Building2, Tag, MessageSquare } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  businessType?: string;
  message: string;
  status: "new" | "contacted" | "won" | "lost";
  notes?: string;
  emailedTo?: string;
  emailError?: string;
  createdAt: string;
};

type Filter = Lead["status"] | "all";

const STATUSES: { value: Lead["status"]; label: string; badge: string }[] = [
  { value: "new", label: "New", badge: "text-blue-600 border-blue-500/30 bg-blue-500/10" },
  { value: "contacted", label: "Contacted", badge: "text-amber-600 border-amber-500/30 bg-amber-500/10" },
  { value: "won", label: "Won", badge: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" },
  { value: "lost", label: "Lost", badge: "text-gray-500 border-gray-500/30 bg-gray-500/10" },
];

const statusMeta = (s: Lead["status"]) => STATUSES.find((x) => x.value === s)!;

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async (f: Filter = filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/leads${f === "all" ? "" : `?status=${f}`}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not load leads (HTTP ${res.status})`);
      setLeads(data.leads || []);
      setCounts(data.counts || {});
      setError("");
    } catch (err: any) {
      setError(err.message || "Could not load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // reload when the filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const select = (lead: Lead) => {
    setSelected(lead);
    setNotes(lead.notes || "");
  };

  const update = async (lead: Lead, patch: Partial<Pick<Lead, "status" | "notes">>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update lead");
      setSelected((s) => (s && s.id === lead.id ? { ...s, ...patch } : s));
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All Leads", count: total },
    ...STATUSES.map((s) => ({ value: s.value as Filter, label: s.label, count: counts[s.value] || 0 })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-accent" />
            Website Leads
          </h1>
          <p className="text-[1.4rem] text-muted mt-1">
            Demo and price requests from the website contact form. Follow up and track each one to a sale.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="bg-base hover:bg-accent-subtle border border-stroke-medium text-bright font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status tabs */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads list */}
        <div className="lg:col-span-1 bg-base-tint border border-stroke-muted rounded-2xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 bg-base border-b border-stroke-muted font-bold text-[1.4rem] text-medium">Incoming Leads</div>
          <div className="divide-y divide-stroke-muted overflow-y-auto flex-1">
            {loading && leads.length === 0 ? (
              <div className="p-8 text-center text-muted text-[1.4rem]">Loading leads…</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-muted text-[1.4rem]">
                No leads{filter === "all" ? " yet" : ` marked "${statusMeta(filter as Lead["status"]).label}"`}.
              </div>
            ) : (
              leads.map((lead) => {
                const st = statusMeta(lead.status);
                return (
                  <button
                    key={lead.id}
                    onClick={() => select(lead)}
                    className={`w-full text-left p-4 hover:bg-accent-subtle transition flex flex-col space-y-1.5 ${
                      selected?.id === lead.id ? "bg-base border-l-4 border-accent" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center text-[1.2rem]">
                      <span className="font-bold text-accent truncate">{lead.company || lead.businessType || "Website"}</span>
                      <span className="text-muted shrink-0">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-bright text-[1.4rem] truncate">{lead.name}</h4>
                    <div className="flex justify-between items-center gap-2 text-[1.2rem] text-muted">
                      <span className="truncate">{lead.message}</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border shrink-0 ${st.badge}`}>{st.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Lead detail */}
        <div className="lg:col-span-2 bg-base-tint border border-stroke-muted rounded-2xl flex flex-col h-[600px] overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 bg-base border-b border-stroke-muted flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <div className="text-[1.2rem] text-muted">Received {new Date(selected.createdAt).toLocaleString()}</div>
                  <h3 className="text-[1.8rem] font-bold text-bright">{selected.name}</h3>
                </div>
                <select
                  value={selected.status}
                  disabled={saving}
                  onChange={(e) => update(selected, { status: e.target.value as Lead["status"] })}
                  className="bg-base-tint border border-stroke-medium text-[1.2rem] text-bright font-bold px-2.5 py-1.5 rounded-lg"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      Status: {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[1.4rem]">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-accent hover:underline truncate">
                    <Mail className="w-4 h-4 shrink-0" /> {selected.email}
                  </a>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-accent hover:underline">
                      <Phone className="w-4 h-4 shrink-0" /> {selected.phone}
                    </a>
                  )}
                  {selected.company && (
                    <span className="flex items-center gap-2 text-bright">
                      <Building2 className="w-4 h-4 shrink-0 text-muted" /> {selected.company}
                    </span>
                  )}
                  {selected.businessType && (
                    <span className="flex items-center gap-2 text-bright">
                      <Tag className="w-4 h-4 shrink-0 text-muted" /> {selected.businessType}
                    </span>
                  )}
                </div>

                <div className="max-w-[60rem] p-4 rounded-2xl rounded-tl-none text-[1.4rem] bg-base-tint text-bright border border-stroke-medium">
                  <div className="text-[1.2rem] opacity-75 border-b pb-1 mb-2 border-stroke-muted font-bold">Message</div>
                  <p className="whitespace-pre-wrap">{selected.message}</p>
                </div>

                {selected.emailError ? (
                  <div className="flex items-start gap-2 text-[1.3rem] text-amber-600">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Email notification failed: {selected.emailError}
                  </div>
                ) : selected.emailedTo ? (
                  <div className="text-[1.2rem] text-muted">Notification emailed to {selected.emailedTo}</div>
                ) : null}
              </div>

              {/* Notes */}
              <div className="p-4 bg-base-tint border-t border-stroke-muted flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Follow-up notes: call outcome, demo date, quoted price…"
                  className="flex-1 px-4 py-2 bg-base border border-stroke-muted rounded-xl text-[1.4rem] text-bright focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={() => update(selected, { notes })}
                  disabled={saving || notes === (selected.notes || "")}
                  className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-[1.4rem]"
                >
                  Save Notes
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center space-y-2">
              <MessageSquare className="w-12 h-12 text-muted" />
              <p className="text-[1.4rem]">Select a lead to see the details and follow up</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
