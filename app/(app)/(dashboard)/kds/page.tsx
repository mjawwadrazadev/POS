"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  RefreshCw,
  Flame,
  ChefHat,
  Bell,
  Check,
  Armchair,
  ShoppingBag,
  Utensils,
  Inbox,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

interface KotItem {
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  station?: string;
}

interface KotTicketRecord {
  _id: string;
  orderNumber: string;
  tableNumber?: string;
  orderType: string;
  items: KotItem[];
  status: "queued" | "preparing" | "ready" | "served";
  priority: "normal" | "rush";
  createdAt: string;
}

type ActiveStatus = "queued" | "preparing" | "ready";

const COLUMNS: {
  status: ActiveStatus;
  title: string;
  hint: string;
  accent: string;
  dot: string;
}[] = [
  { status: "queued", title: "New", hint: "Waiting to start", accent: "border-t-amber-500", dot: "bg-amber-500" },
  { status: "preparing", title: "Preparing", hint: "On the stove", accent: "border-t-blue-600", dot: "bg-blue-600" },
  { status: "ready", title: "Ready", hint: "Waiting for pickup", accent: "border-t-emerald-600", dot: "bg-emerald-600" },
];

const NEXT_ACTION: Record<ActiveStatus, { to: "preparing" | "ready" | "served"; label: string; icon: React.ReactNode; className: string }> = {
  queued: { to: "preparing", label: "Start preparing", icon: <Flame className="w-5 h-5" />, className: "bg-blue-600 hover:bg-blue-500 text-white" },
  preparing: { to: "ready", label: "Mark ready", icon: <Bell className="w-5 h-5" />, className: "bg-emerald-600 hover:bg-emerald-500 text-white" },
  ready: { to: "served", label: "Served", icon: <Check className="w-5 h-5" />, className: "bg-base-opp text-[var(--t-opp-bright)] hover:opacity-90" },
};

const STATIONS = ["All", "Mains", "Grill", "Drinks", "Bakery"];

function elapsedMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}

function timerStyle(mins: number) {
  if (mins >= 15) return "bg-rose-600 text-white animate-pulse";
  if (mins >= 10) return "bg-amber-400 text-black";
  return "bg-base-tint text-medium border border-stroke-muted";
}

export default function KitchenDisplaySystemPage() {
  const [tickets, setTickets] = useState<KotTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState("All");
  const [busyTicket, setBusyTicket] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetchTickets();
    // Auto-refresh every 10 seconds while the board is on screen; a hidden tab skips polls
    // and catches up the moment it is shown again
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") fetchTickets();
    }, 10000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchTickets();
    };
    document.addEventListener("visibilitychange", onVisible);
    const clock = setInterval(() => setNow(Date.now()), 30000); // Keep ticket timers moving between polls
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/kot");
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);
        setNow(Date.now());
      }
    } catch (err) {
      console.error("Failed to fetch KDS tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: "preparing" | "ready" | "served") => {
    setBusyTicket(ticketId);
    try {
      const res = await fetch("/api/kot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      await fetchTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyTicket(null);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (selectedStation === "All") return true;
    return t.items.some((i) => (i.station || "mains").toLowerCase() === selectedStation.toLowerCase());
  });

  const lateCount = filteredTickets.filter((t) => t.status !== "ready" && elapsedMinutes(t.createdAt, now) >= 15).length;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-12.8rem)]">
      <PageActions>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-700 font-semibold text-[1.2rem]">
          <ChefHat className="w-4 h-4" />
          {filteredTickets.length} active ticket{filteredTickets.length === 1 ? "" : "s"}
          {lateCount > 0 && <span className="text-rose-600"> · {lateCount} late</span>}
        </span>
        <div className="inline-flex bg-base-tint border border-stroke-muted p-1">
          {STATIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStation(s)}
              className={`px-3.5 py-1.5 text-[1.3rem] font-semibold transition-colors ${
                selectedStation === s ? "bg-orange-600 text-white" : "text-medium hover:text-bright"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={fetchTickets} className="btn btn-secondary py-2.5 px-3.5 text-[1.2rem]" title="Refresh now (updates every 10 seconds)">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </PageActions>

      {/* Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {COLUMNS.map((col) => {
          const colTickets = filteredTickets.filter((t) => t.status === col.status);
          return (
            <section
              key={col.status}
              className={`flex flex-col min-h-[30rem] lg:min-h-0 bg-base-tint border border-stroke-muted border-t-4 ${col.accent}`}
            >
              <header className="flex items-center justify-between px-4 py-3 border-b border-stroke-muted bg-base-bright flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`avatar-round w-2.5 h-2.5 ${col.dot}`} />
                  <h2 className="text-[1.6rem] font-bold text-bright">{col.title}</h2>
                  <span className="text-[1.25rem] text-muted">{col.hint}</span>
                </div>
                <span className="min-w-[2.8rem] text-center px-2 py-0.5 bg-base-tint border border-stroke-muted text-[1.3rem] font-bold text-bright">
                  {colTickets.length}
                </span>
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-3 space-y-3">
                {colTickets.length === 0 ? (
                  <div className="h-full min-h-[16rem] flex flex-col items-center justify-center gap-2 text-center text-muted">
                    <Inbox className="w-8 h-8 text-stroke-medium" />
                    <p className="text-[1.3rem]">
                      {col.status === "queued" ? "New kitchen orders from the POS land here." : "Nothing here right now."}
                    </p>
                  </div>
                ) : (
                  colTickets.map((ticket) => {
                    const mins = elapsedMinutes(ticket.createdAt, now);
                    const action = NEXT_ACTION[col.status];
                    const isDineIn = ticket.orderType === "dine_in";
                    return (
                      <article key={ticket._id} className="bg-base-bright border border-stroke-muted shadow-sm">
                        <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[1.7rem] font-extrabold text-bright">#{ticket.orderNumber}</span>
                              {ticket.priority === "rush" && (
                                <span className="px-1.5 py-0.5 text-[1rem] font-bold bg-rose-600 text-white uppercase">Rush</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[1.2rem] text-medium">
                              <span className="inline-flex items-center gap-1 capitalize">
                                {isDineIn ? <Utensils className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                                {ticket.orderType.replace("_", " ")}
                              </span>
                              {ticket.tableNumber && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent text-white font-bold">
                                  <Armchair className="w-3.5 h-3.5" /> {ticket.tableNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-[1.25rem] font-bold flex-shrink-0 ${timerStyle(mins)}`}>
                            <Clock className="w-3.5 h-3.5" /> {mins}m
                          </span>
                        </div>

                        <ul className="px-4 py-2 border-t border-dashed border-stroke-muted space-y-1.5">
                          {ticket.items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="min-w-[3.2rem] text-center py-0.5 bg-orange-500/10 text-orange-700 font-extrabold text-[1.5rem]">
                                {item.quantity}×
                              </span>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="text-[1.45rem] font-semibold text-bright leading-snug">{item.productName}</div>
                                {item.notes && <div className="text-[1.2rem] text-amber-700 italic">Note: {item.notes}</div>}
                              </div>
                              <span className="text-[1.05rem] uppercase text-muted pt-1">{item.station || "Mains"}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="p-3 pt-2">
                          <button
                            disabled={busyTicket === ticket._id}
                            onClick={() => handleUpdateStatus(ticket._id, action.to)}
                            className={`w-full flex items-center justify-center gap-2 py-3 text-[1.4rem] font-bold transition disabled:opacity-50 ${action.className}`}
                          >
                            {action.icon}
                            {busyTicket === ticket._id ? "Updating…" : action.label}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
