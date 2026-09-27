"use client";

import { useEffect, useState } from "react";
import { Inbox, Mail, Phone, AlertTriangle } from "lucide-react";

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

const STATUSES: { value: Lead["status"]; label: string; badge: string }[] = [
  { value: "new", label: "New", badge: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { value: "contacted", label: "Contacted", badge: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "won", label: "Won", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "lost", label: "Lost", badge: "bg-gray-500/10 text-gray-500 border-gray-500/30" },
];

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Lead["status"] | "all">("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch(`/api/super-admin/leads${filter === "all" ? "" : `?status=${filter}`}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load leads");
      setLeads(data.leads);
      setCounts(data.counts || {});
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // reload when the filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const update = async (lead: Lead, patch: Partial<Pick<Lead, "status" | "notes">>) => {
    const res = await fetch("/api/super-admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, ...patch }),
    });
    if (res.ok) {
      setSelected((s) => (s && s.id === lead.id ? { ...s, ...patch } : s));
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not update lead");
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.4rem] font-bold text-bright flex items-center gap-2">
            <Inbox className="w-6 h-6 text-accent" /> Website Leads
          </h1>
          <p className="text-muted text-[1.3rem]">Demo and price requests from the website contact form.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: "all" as const, label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-[1.2rem] font-bold border ${
                filter === s.value ? "bg-accent text-white border-accent" : "bg-base-tint text-medium border-stroke-muted"
              }`}
            >
              {s.label} ({s.value === "all" ? total : counts[s.value] || 0})
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-lg text-[1.3rem]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-base-tint border border-stroke-muted rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-muted">No leads yet. They appear here when someone submits the website contact form.</div>
          ) : (
            <ul className="divide-y divide-stroke-muted">
              {leads.map((lead) => {
                const st = STATUSES.find((s) => s.value === lead.status)!;
                return (
                  <li key={lead.id}>
                    <button
                      onClick={() => {
                        setSelected(lead);
                        setNotes(lead.notes || "");
                      }}
                      className={`w-full text-left p-4 hover:bg-accent-subtle transition ${selected?.id === lead.id ? "bg-accent-subtle" : ""}`}
                    >
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-bright truncate">
                            {lead.name}
                            {lead.company ? <span className="text-muted font-normal"> · {lead.company}</span> : null}
                          </div>
                          <div className="text-[1.2rem] text-muted truncate">
                            {lead.businessType || "—"} · {lead.message}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${st.badge}`}>{st.label}</span>
                          <div className="text-[1.1rem] text-muted">{new Date(lead.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-base-tint border border-stroke-muted rounded-2xl p-5 space-y-4 lg:sticky lg:top-4">
              <div>
                <h2 className="text-[1.8rem] font-bold text-bright">{selected.name}</h2>
                <div className="text-[1.2rem] text-muted">{new Date(selected.createdAt).toLocaleString()}</div>
              </div>
              <div className="space-y-1 text-[1.3rem]">
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-accent hover:underline">
                  <Mail className="w-4 h-4" /> {selected.email}
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-accent hover:underline">
                    <Phone className="w-4 h-4" /> {selected.phone}
                  </a>
                )}
                {selected.company && <div className="text-medium">Business: {selected.company}</div>}
                {selected.businessType && <div className="text-medium">Type: {selected.businessType}</div>}
              </div>
              <p className="bg-base border border-stroke-muted rounded-lg p-3 text-[1.3rem] text-bright whitespace-pre-wrap">{selected.message}</p>

              {selected.emailError && (
                <div className="flex items-start gap-2 text-[1.2rem] text-amber-600">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Email notification failed: {selected.emailError}
                </div>
              )}

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update(selected, { status: s.value })}
                      className={`px-3 py-1 rounded-lg text-[1.2rem] font-bold border ${
                        selected.status === s.value ? s.badge : "border-stroke-muted text-muted"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-base border border-stroke-muted rounded-lg p-3 text-[1.3rem] text-bright"
                  placeholder="Call notes, demo date, quoted price…"
                />
                <button
                  onClick={() => update(selected, { notes })}
                  disabled={notes === (selected.notes || "")}
                  className="mt-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-[1.3rem]"
                >
                  Save notes
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-base-tint border border-dashed border-stroke-muted rounded-2xl p-8 text-center text-muted">
              Select a lead to see the details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
