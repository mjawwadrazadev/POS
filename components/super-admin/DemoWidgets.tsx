"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Phone,
  MapPin,
  Trash2,
  ClipboardCheck,
  Copy,
  X,
  KeyRound,
  Presentation,
  Activity,
  ThumbsUp,
  Target,
  BadgeCheck,
  CheckCircle2,
} from "lucide-react";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";

export type DemoRecord = {
  id: string;
  agentId: string;
  agentName: string;
  businessType: string;
  clientName: string;
  clientBusinessName: string;
  clientPhone: string;
  clientCity: string;
  notes: string;
  storeCode: string;
  status: "active" | "expired";
  expiresAt: string;
  endedAt: string | null;
  endedReason: "expired" | "ended_by_agent" | null;
  activity: { orders: number; sales: number; products: number } | null;
  outcome: "pending" | "successful" | "unsuccessful";
  satisfaction: "satisfied" | "neutral" | "not_satisfied" | null;
  closeChance: "high" | "medium" | "low" | "none" | null;
  converted: boolean;
  feedback: string;
  followUpDate: string | null;
  reportedAt: string | null;
  createdAt: string;
  credentials: { storeCode: string; email: string; password: string; pin: string } | null;
};

export type DemoStats = {
  total: number;
  active: number;
  reported: number;
  successful: number;
  unsuccessful: number;
  satisfied: number;
  likelyToClose: number;
  converted: number;
  conversionRate: number;
  last30Days: number;
};

const OUTCOME_META: Record<DemoRecord["outcome"], { label: string; cls: string }> = {
  pending: { label: "Report pending", cls: "text-amber-600 border-amber-500/30 bg-amber-500/10" },
  successful: { label: "Successful", cls: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" },
  unsuccessful: { label: "Unsuccessful", cls: "text-red-600 border-red-500/30 bg-red-500/10" },
};
const SATISFACTION_LABEL: Record<string, string> = { satisfied: "Satisfied", neutral: "Neutral", not_satisfied: "Not satisfied" };
const CLOSE_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low", none: "No chance" };

const inputCls =
  "w-full px-3.5 py-2.5 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright focus:ring-2 focus:ring-accent focus:outline-none";
const labelCls = "block text-[1.2rem] font-bold text-muted uppercase mb-1";

function verticalTitle(bt: string) {
  return VERTICAL_CONFIGS[bt as BusinessType]?.title || bt;
}

function timeLeft(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Ending…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

// ─── Stats ──────────────────────────────────────────────────────────

export function DemoStatsCards({ stats }: { stats: DemoStats }) {
  const cards = [
    { label: "Total Demos", value: stats.total, sub: `${stats.last30Days} in last 30 days`, icon: Presentation, color: "text-accent" },
    { label: "Running Now", value: stats.active, sub: "24-hour demo stores", icon: Activity, color: "text-blue-500" },
    { label: "Successful", value: stats.successful, sub: `${stats.total - stats.reported} reports pending`, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Clients Satisfied", value: stats.satisfied, sub: `of ${stats.reported} reported`, icon: ThumbsUp, color: "text-teal-500" },
    { label: "Likely to Close", value: stats.likelyToClose, sub: "High / medium chance", icon: Target, color: "text-amber-500" },
    { label: "Closed Sales", value: stats.converted, sub: `${stats.conversionRate}% conversion`, icon: BadgeCheck, color: "text-purple-500" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-base-tint border border-stroke-muted rounded-2xl p-4">
          <div className="flex items-center justify-between text-[1.2rem] text-muted font-bold uppercase">
            <span>{c.label}</span>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <div className="text-[2.8rem] font-black text-bright mt-1 tabular-nums">{c.value}</div>
          <div className="text-[1.15rem] text-muted">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Login details ──────────────────────────────────────────────────

export function CredentialsBlock({ demo }: { demo: DemoRecord }) {
  const [copied, setCopied] = useState(false);
  if (!demo.credentials) return null;
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
  const c = demo.credentials;
  const text = `RST POS Demo\nLogin: ${loginUrl}\nStore Code: ${c.storeCode}\nPIN: ${c.pin}\nEmail: ${c.email}\nPassword: ${c.password}`;
  const rows: [string, string][] = [
    ["Login page", loginUrl],
    ["Store Code", c.storeCode],
    ["PIN", c.pin],
    ["Email", c.email],
    ["Password", c.password],
  ];
  return (
    <div className="bg-base border border-stroke-muted rounded-xl p-4 space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-[1.3rem]">
          <span className="text-muted shrink-0">{k}</span>
          <code className="font-mono font-bold text-bright break-all text-right">{v}</code>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="border border-stroke-medium px-3 py-1.5 rounded-lg text-[1.2rem] font-bold text-bright flex items-center gap-1 hover:bg-accent-subtle"
      >
        <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy login details"}
      </button>
      <p className="text-[1.15rem] text-muted">
        Open the login page on the client&apos;s device, or in a private / incognito window on yours (you are signed in here).
      </p>
    </div>
  );
}

// ─── Outcome report ─────────────────────────────────────────────────

function ReportModal({ demo, onClose, onSaved }: { demo: DemoRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    outcome: demo.outcome === "pending" ? "successful" : demo.outcome,
    satisfaction: demo.satisfaction || "",
    closeChance: demo.closeChance || "",
    converted: demo.converted,
    feedback: demo.feedback,
    followUpDate: demo.followUpDate ? demo.followUpDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const choice = (key: "outcome" | "satisfaction" | "closeChance", options: [string, string][]) => (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <button
          type="button"
          key={value}
          onClick={() => setForm({ ...form, [key]: value })}
          className={`px-3 py-2 rounded-lg border text-[1.3rem] font-bold transition ${
            form[key] === value ? "border-accent bg-accent-subtle text-accent" : "border-stroke-muted text-bright hover:border-stroke-medium"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/super-admin/demos/${demo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the report");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={save} className="bg-base-tint border border-stroke-muted rounded-2xl max-w-[56rem] w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex justify-between items-center border-b border-stroke-muted pb-3">
          <div>
            <h2 className="text-[2rem] font-bold text-bright">Demo Report</h2>
            <p className="text-[1.3rem] text-muted">
              {demo.clientBusinessName} · {demo.clientName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-bright">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className={labelCls}>How did the demo go?</label>
          {choice("outcome", [
            ["successful", "Successful"],
            ["unsuccessful", "Unsuccessful"],
            ["pending", "Not reported yet"],
          ])}
        </div>
        <div>
          <label className={labelCls}>Was the client satisfied?</label>
          {choice("satisfaction", [
            ["satisfied", "Satisfied"],
            ["neutral", "Neutral"],
            ["not_satisfied", "Not satisfied"],
          ])}
        </div>
        <div>
          <label className={labelCls}>Chance the client will buy</label>
          {choice("closeChance", [
            ["high", "High"],
            ["medium", "Medium"],
            ["low", "Low"],
            ["none", "No chance"],
          ])}
        </div>
        <label className="flex items-center gap-3 p-3 rounded-xl border border-stroke-muted cursor-pointer">
          <input
            type="checkbox"
            checked={form.converted}
            onChange={(e) => setForm({ ...form, converted: e.target.checked })}
            className="w-5 h-5 accent-emerald-600"
          />
          <span className="text-[1.4rem] text-bright font-bold">Client bought a subscription (sale closed)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Client feedback / notes</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="What they liked, objections, price discussed…"
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Follow-up date</label>
            <input type="date" className={inputCls} value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-xl text-[1.3rem]">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-[1.4rem] font-bold text-muted">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-[1.4rem]"
          >
            {saving ? "Saving…" : "Save Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── List ───────────────────────────────────────────────────────────

type Tab = "active" | "pending" | "ended" | "all";

export function DemoList({
  demos,
  loading,
  onChanged,
  canManage,
  showAgent = false,
}: {
  demos: DemoRecord[];
  loading: boolean;
  onChanged: () => void;
  canManage: boolean; // end demos and write reports (the agent's own screen)
  showAgent?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [now, setNow] = useState(() => Date.now());
  const [reporting, setReporting] = useState<DemoRecord | null>(null);
  const [openCreds, setOpenCreds] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const endDemo = async (d: DemoRecord) => {
    if (!confirm(`End the demo for ${d.clientBusinessName} now? The demo store and everything in it will be deleted.`)) return;
    const res = await fetch(`/api/super-admin/demos/${d.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || "Could not end the demo");
    onChanged();
  };

  const tabs: { value: Tab; label: string; items: DemoRecord[] }[] = [
    { value: "all", label: "All", items: demos },
    { value: "active", label: "Running", items: demos.filter((d) => d.status === "active") },
    { value: "pending", label: "Report Pending", items: demos.filter((d) => d.outcome === "pending") },
    { value: "ended", label: "Ended", items: demos.filter((d) => d.status === "expired") },
  ];
  const shown = tabs.find((t) => t.value === tab)!.items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-2 border-b border-stroke-muted">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-3 font-bold text-[1.4rem] border-b-2 transition ${
              tab === t.value ? "border-accent text-accent" : "border-transparent text-muted hover:text-bright"
            }`}
          >
            {t.label} ({t.items.length})
          </button>
        ))}
      </div>

      {loading && demos.length === 0 ? (
        <div className="p-8 text-center text-muted text-[1.4rem]">Loading demos…</div>
      ) : shown.length === 0 ? (
        <div className="p-8 text-center text-muted text-[1.4rem] bg-base-tint border border-stroke-muted rounded-2xl">
          No demos here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shown.map((d) => {
            const active = d.status === "active";
            const outcome = OUTCOME_META[d.outcome];
            return (
              <div key={d.id} className="bg-base-tint border border-stroke-muted rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-[1.2rem] font-bold text-accent uppercase">{verticalTitle(d.businessType)}</div>
                    <h3 className="text-[1.8rem] font-bold text-bright truncate">{d.clientBusinessName}</h3>
                    <div className="text-[1.3rem] text-muted">{d.clientName}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {active ? (
                      <span className="px-2 py-0.5 rounded font-bold text-[1.1rem] border text-blue-600 border-blue-500/30 bg-blue-500/10 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeLeft(d.expiresAt, now)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold text-[1.1rem] border text-gray-500 border-gray-500/30 bg-gray-500/10">
                        {d.endedReason === "ended_by_agent" ? "Ended early" : "Expired & deleted"}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded font-bold text-[1.1rem] border ${outcome.cls}`}>
                      {d.converted ? "Sale closed" : outcome.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[1.25rem] text-muted">
                  {showAgent && <span className="font-bold text-bright">Agent: {d.agentName}</span>}
                  {d.clientPhone && (
                    <a href={`tel:${d.clientPhone}`} className="flex items-center gap-1 text-accent hover:underline">
                      <Phone className="w-3.5 h-3.5" /> {d.clientPhone}
                    </a>
                  )}
                  {d.clientCity && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {d.clientCity}
                    </span>
                  )}
                  <span>Started {new Date(d.createdAt).toLocaleString()}</span>
                </div>

                {(d.satisfaction || d.closeChance || d.feedback || d.followUpDate) && (
                  <div className="bg-base border border-stroke-muted rounded-xl p-3 text-[1.3rem] space-y-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {d.satisfaction && (
                        <span>
                          <span className="text-muted">Client: </span>
                          <b className="text-bright">{SATISFACTION_LABEL[d.satisfaction]}</b>
                        </span>
                      )}
                      {d.closeChance && (
                        <span>
                          <span className="text-muted">Close chance: </span>
                          <b className="text-bright">{CLOSE_LABEL[d.closeChance]}</b>
                        </span>
                      )}
                      {d.followUpDate && (
                        <span>
                          <span className="text-muted">Follow-up: </span>
                          <b className="text-bright">{new Date(d.followUpDate).toLocaleDateString()}</b>
                        </span>
                      )}
                    </div>
                    {d.feedback && <p className="text-bright whitespace-pre-wrap">{d.feedback}</p>}
                  </div>
                )}

                {!active && d.activity && (
                  <div className="text-[1.2rem] text-muted">
                    During the demo: {d.activity.orders} sales rung up (PKR {Math.round(d.activity.sales).toLocaleString()})
                  </div>
                )}

                {active && openCreds === d.id && <CredentialsBlock demo={d} />}

                {canManage && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {active && d.credentials && (
                      <button
                        onClick={() => setOpenCreds(openCreds === d.id ? null : d.id)}
                        className="border border-stroke-medium px-3 py-1.5 rounded-lg text-[1.2rem] font-bold text-bright hover:bg-accent-subtle flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> {openCreds === d.id ? "Hide login" : "Show login"}
                      </button>
                    )}
                    <button
                      onClick={() => setReporting(d)}
                      className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-[1.2rem] font-bold flex items-center gap-1"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> {d.outcome === "pending" ? "Record Outcome" : "Update Report"}
                    </button>
                    {active && (
                      <button
                        onClick={() => endDemo(d)}
                        className="border border-red-500/40 text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-[1.2rem] font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> End Demo Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reporting && (
        <ReportModal
          demo={reporting}
          onClose={() => setReporting(null)}
          onSaved={() => {
            setReporting(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
