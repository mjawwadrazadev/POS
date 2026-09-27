"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  RefreshCw,
  Flame,
  ChefHat,
  Bell,
  Check,
} from "lucide-react";

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

export default function KitchenDisplaySystemPage() {
  const [tickets, setTickets] = useState<KotTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState("All");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
    const timer = setInterval(fetchTickets, 10000); // Auto-refresh KDS every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/kot");
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch KDS tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: "preparing" | "ready" | "served") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/kot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getElapsedTimeMins = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const now = new Date().getTime();
    return Math.floor((now - created) / 60000);
  };

  const stations = ["All", "Mains", "Grill", "Drinks", "Bakery"];

  const filteredTickets = tickets.filter((t) => {
    if (selectedStation === "All") return true;
    return t.items.some((i) => (i.station || "mains").toLowerCase() === selectedStation.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* KDS Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b0b0d] border border-orange-500/40 p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-orange-400 uppercase tracking-widest mb-1">
            <ChefHat className="w-4 h-4" /> Real-time Kitchen Operations
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            Kitchen Display System (KDS)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Live order tickets dispatch, station preparation status, and order ready alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-900 border border-gray-800 p-1 font-mono text-xs">
            {stations.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStation(s)}
                className={`px-3 py-1 font-bold uppercase transition ${
                  selectedStation === s ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={fetchTickets}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono px-3 py-2 border border-gray-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Active KDS Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full bg-[#0b0b0d] border border-gray-800 p-12 text-center text-gray-500 font-mono text-sm space-y-2">
            <ChefHat className="w-10 h-10 mx-auto text-gray-700" />
            <p>No active kitchen tickets. New restaurant orders will appear here automatically.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const elapsed = getElapsedTimeMins(ticket.createdAt);
            const isLate = elapsed > 15;

            return (
              <div
                key={ticket._id}
                className={`bg-[#0b0b0d] border flex flex-col justify-between overflow-hidden shadow-xl font-mono text-xs ${
                  ticket.status === "queued"
                    ? "border-amber-500/50"
                    : ticket.status === "preparing"
                    ? "border-blue-500/60"
                    : "border-emerald-500/60"
                }`}
              >
                {/* Ticket Top Header */}
                <div
                  className={`px-4 py-3 border-b flex justify-between items-center ${
                    ticket.status === "queued"
                      ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                      : ticket.status === "preparing"
                      ? "bg-blue-950/40 border-blue-500/30 text-blue-300"
                      : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-sm text-white">{ticket.orderNumber}</span>
                    <span className="ml-2 text-[10px] uppercase font-bold text-gray-400">
                      ({ticket.orderType.replace("_", " ")})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.tableNumber && (
                      <span className="bg-gray-900 border border-gray-700 px-2 py-0.5 font-bold text-white text-[11px]">
                        {ticket.tableNumber}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border ${
                        isLate
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                          : "bg-gray-900 text-gray-300 border-gray-700"
                      }`}
                    >
                      <Clock className="w-3 h-3" /> {elapsed}m ago
                    </span>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 flex-1 space-y-3 divide-y divide-gray-800/80">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-orange-400">
                            {item.quantity}x
                          </span>
                          <span className="font-bold text-white text-sm">{item.productName}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-amber-400 italic mt-0.5">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase text-gray-500 bg-gray-900 border border-gray-800 px-1.5 py-0.5">
                        {item.station || "Mains"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status Bar & Action Footer */}
                <div className="p-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
                  <span className="uppercase text-[10px] font-bold text-gray-400">
                    Status: <b className="text-white">{ticket.status}</b>
                  </span>

                  {ticket.status === "queued" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(ticket._id, "preparing")}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <Flame className="w-3.5 h-3.5" /> Start Preparing
                    </button>
                  )}

                  {ticket.status === "preparing" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(ticket._id, "ready")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <Bell className="w-3.5 h-3.5" /> Mark Ready
                    </button>
                  )}

                  {ticket.status === "ready" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(ticket._id, "served")}
                      className="bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/40 font-bold px-3 py-1.5 uppercase tracking-wider transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Serve Ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
