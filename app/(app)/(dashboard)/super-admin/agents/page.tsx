"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, RefreshCw, AlertTriangle, UserPlus } from "lucide-react";
import { DemoList, DemoRecord, DemoStats, DemoStatsCards } from "@/components/super-admin/DemoWidgets";

type AgentRow = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  phone: string;
  territory: string;
  commissionRate: number | null;
  stats: DemoStats;
  lastDemoAt: string | null;
};

export default function AgentPerformancePage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [totals, setTotals] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string>("all");
  const [demos, setDemos] = useState<DemoRecord[]>([]);
  const [demosLoading, setDemosLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/agents");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Could not load agents (HTTP ${res.status})`);
      setAgents(data.agents || []);
      setTotals(data.totals || null);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDemos = async (agentId: string) => {
    setDemosLoading(true);
    try {
      const res = await fetch(`/api/super-admin/demos${agentId === "all" ? "" : `?agentId=${agentId}`}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load demos");
      setDemos(data.demos || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDemosLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    loadDemos(selected);
  }, [selected]);

  // Best closers first
  const ranked = [...agents].sort((a, b) => b.stats.converted - a.stats.converted || b.stats.successful - a.stats.successful);
  const selectedAgent = agents.find((a) => a.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" />
            Agent Performance
          </h1>
          <p className="text-[1.4rem] text-muted mt-1">
            Every demo your sales agents gave, how the client felt, and which ones closed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              loadAgents();
              loadDemos(selected);
            }}
            className="bg-base hover:bg-accent-subtle border border-stroke-medium text-bright font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/super-admin/users"
            className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Agent</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-4 rounded-xl text-[1.4rem] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {(selectedAgent?.stats || totals) && <DemoStatsCards stats={selectedAgent?.stats || totals!} />}

      <div className="bg-base-tint border border-stroke-muted rounded-2xl overflow-x-auto">
        <table className="w-full text-[1.4rem] min-w-[90rem]">
          <thead>
            <tr className="bg-base border-b border-stroke-muted text-left text-[1.2rem] uppercase text-muted">
              <th className="p-4">Agent</th>
              <th className="p-4 text-right">Demos</th>
              <th className="p-4 text-right">Running</th>
              <th className="p-4 text-right">Successful</th>
              <th className="p-4 text-right">Satisfied</th>
              <th className="p-4 text-right">Likely to Close</th>
              <th className="p-4 text-right">Closed</th>
              <th className="p-4 text-right">Conversion</th>
              <th className="p-4">Last Demo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke-muted">
            <tr
              onClick={() => setSelected("all")}
              className={`cursor-pointer hover:bg-accent-subtle ${selected === "all" ? "bg-accent-subtle" : ""}`}
            >
              <td className="p-4 font-bold text-bright" colSpan={9}>
                All agents{totals ? ` · ${totals.total} demos` : ""}
              </td>
            </tr>
            {loading && agents.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted">Loading agents…</td>
              </tr>
            ) : ranked.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted">
                  No sales agents yet. Add one from User Management.
                </td>
              </tr>
            ) : (
              ranked.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={`cursor-pointer hover:bg-accent-subtle ${selected === a.id ? "bg-accent-subtle" : ""} ${a.isActive ? "" : "opacity-60"}`}
                >
                  <td className="p-4">
                    <div className="font-bold text-bright">
                      {a.fullName} {!a.isActive && <span className="text-red-500 text-[1.1rem]">(disabled)</span>}
                    </div>
                    <div className="text-[1.2rem] text-muted">
                      {[a.territory, a.phone, a.commissionRate != null ? `${a.commissionRate}% commission` : ""].filter(Boolean).join(" · ") || a.email}
                    </div>
                  </td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.total}</td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.active}</td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.successful}</td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.satisfied}</td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.likelyToClose}</td>
                  <td className="p-4 text-right tabular-nums font-bold text-emerald-600">{a.stats.converted}</td>
                  <td className="p-4 text-right tabular-nums text-bright">{a.stats.conversionRate}%</td>
                  <td className="p-4 text-muted text-[1.3rem]">{a.lastDemoAt ? new Date(a.lastDemoAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-[1.8rem] font-bold text-bright mb-2">
          {selectedAgent ? `${selectedAgent.fullName}'s demos` : "All demos"}
        </h2>
        <DemoList demos={demos} loading={demosLoading} onChanged={() => loadDemos(selected)} canManage={false} showAgent={!selectedAgent} />
      </div>
    </div>
  );
}
