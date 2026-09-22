"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Megaphone, Send, CheckCircle, Clock, MessageSquare, Plus, AlertTriangle } from "lucide-react";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { ProvisionTenantModal } from "@/components/super-admin/ProvisionTenantModal";

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tickets" | "announcements">("tickets");
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Selected Ticket
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [newStatus, setNewStatus] = useState("in_progress");
  const [replying, setReplying] = useState(false);

  // Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "maintenance" | "feature">("info");

  const fetchSupportData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, annRes] = await Promise.all([
        fetch("/api/support"),
        fetch("/api/super-admin/announcements"),
      ]);

      const ticketsJson = await ticketsRes.json();
      const annJson = await annRes.json();

      if (ticketsJson.success) setTickets(ticketsJson.tickets);
      if (annJson.success) setAnnouncements(annJson.announcements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
  }, []);

  const openTicketDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/support/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setNewStatus(data.ticket.status);
      }
    } catch (err) {
      alert("Failed to load ticket");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyContent.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent("");
        openTicketDetail(selectedTicket.id);
        fetchSupportData();
      }
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/super-admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: annTitle, content: annContent, type: annType }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAnnModal(false);
        setAnnTitle("");
        setAnnContent("");
        fetchSupportData();
      }
    } catch (err) {
      alert("Failed to create announcement");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SuperAdminHeader onOpenNewTenantModal={() => setShowProvisionModal(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-blue-400" />
              Platform Support & Broadcast Announcements
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Respond to tenant support tickets and broadcast platform system announcements
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAnnModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center space-x-2"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-3 font-bold text-sm border-b-2 transition flex items-center space-x-2 ${
              activeTab === "tickets" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Support Tickets Inbox ({tickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-3 font-bold text-sm border-b-2 transition flex items-center space-x-2 ${
              activeTab === "announcements" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcast Announcements ({announcements.length})</span>
          </button>
        </div>

        {/* Tab 1: Tickets Queue & Conversation View */}
        {activeTab === "tickets" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets Table Column */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-sm text-slate-300">
                Incoming Tenant Tickets
              </div>
              <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No support tickets found.</div>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTicketDetail(t.id)}
                      className={`w-full text-left p-4 hover:bg-slate-800/80 transition flex flex-col space-y-1.5 ${
                        selectedTicket?.id === t.id ? "bg-slate-800 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-blue-400">{t.ticketNumber}</span>
                        <span className="text-slate-400">{t.tenantName}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm truncate">{t.subject}</h4>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="capitalize">{t.category}</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded font-bold uppercase text-[10px] text-amber-400 border border-amber-500/20">
                          {t.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Conversation Detail Column */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[600px] overflow-hidden">
              {selectedTicket ? (
                <>
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-400">
                        <strong className="text-white">{selectedTicket.tenantName}</strong> · Owner: {selectedTicket.creatorName} ({selectedTicket.creatorEmail})
                      </div>
                      <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 font-bold px-2.5 py-1.5 rounded-lg"
                      >
                        <option value="open">Status: Open</option>
                        <option value="in_progress">Status: In Progress</option>
                        <option value="resolved">Status: Resolved</option>
                        <option value="closed">Status: Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-950/40">
                    {selectedTicket.messages.map((m: any, idx: number) => {
                      const isStaff = m.senderRole === "super_admin" || m.senderRole === "platform_support";
                      return (
                        <div key={idx} className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-md p-4 rounded-2xl text-sm space-y-1 ${
                              isStaff ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs opacity-75 border-b pb-1 mb-1 border-current">
                              <span className="font-bold">{m.senderName} ({isStaff ? "Super Admin HQ" : "Tenant"})</span>
                              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="p-4 bg-slate-900 border-t border-slate-800 flex space-x-3">
                    <input
                      type="text"
                      placeholder="Type response to tenant admin..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={replying}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-2">
                  <MessageSquare className="w-12 h-12 text-slate-600" />
                  <p className="text-sm">Select a support ticket to view conversation thread and respond</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Broadcast Announcements */}
        {activeTab === "announcements" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Active Broadcast Announcements</h3>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{a.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{a.content}</p>
                    <div className="text-[10px] text-slate-500 mt-2">Posted: {new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2.5 py-1 rounded border border-purple-500/30 uppercase">
                    {a.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Broadcast Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Broadcast Platform Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled System Maintenance on Sunday"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="feature">New Feature</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Content</label>
                <textarea
                  rows={3}
                  placeholder="Announcement details visible on tenant dashboards..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold"
                >
                  Broadcast Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={fetchSupportData}
      />
    </div>
  );
}
