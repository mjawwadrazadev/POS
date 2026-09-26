"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Megaphone, Send, MessageSquare } from "lucide-react";

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"tickets" | "announcements">("tickets");

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
    } catch {
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
    } catch {
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
    } catch {
      alert("Failed to create announcement");
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-accent" />
              Platform Support & Broadcast Announcements
            </h1>
            <p className="text-[1.4rem] text-muted mt-1">
              Respond to tenant support tickets and broadcast platform system announcements
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAnnModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-[1.4rem] transition flex items-center space-x-2"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-stroke-muted">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-3 font-bold text-[1.4rem] border-b-2 transition flex items-center space-x-2 ${
              activeTab === "tickets" ? "border-accent text-accent" : "border-transparent text-muted hover:text-bright"
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Support Tickets Inbox ({tickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-3 font-bold text-[1.4rem] border-b-2 transition flex items-center space-x-2 ${
              activeTab === "announcements" ? "border-purple-500 text-purple-600" : "border-transparent text-muted hover:text-bright"
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
            <div className="lg:col-span-1 bg-base-tint border border-stroke-muted rounded-2xl overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 bg-base border-b border-stroke-muted font-bold text-[1.4rem] text-medium">
                Incoming Tenant Tickets
              </div>
              <div className="divide-y divide-stroke-muted overflow-y-auto flex-1">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-muted text-[1.4rem]">No support tickets found.</div>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTicketDetail(t.id)}
                      className={`w-full text-left p-4 hover:bg-accent-subtle transition flex flex-col space-y-1.5 ${
                        selectedTicket?.id === t.id ? "bg-base border-l-4 border-accent" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center text-[1.2rem]">
                        <span className="font-mono font-bold text-accent">{t.ticketNumber}</span>
                        <span className="text-muted">{t.tenantName}</span>
                      </div>
                      <h4 className="font-bold text-bright text-[1.4rem] truncate">{t.subject}</h4>
                      <div className="flex justify-between items-center text-[1.2rem] text-muted">
                        <span className="capitalize">{t.category}</span>
                        <span className="bg-base px-2 py-0.5 rounded font-bold uppercase text-[10px] text-amber-600 border border-amber-500/20">
                          {t.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Conversation Detail Column */}
            <div className="lg:col-span-2 bg-base-tint border border-stroke-muted rounded-2xl flex flex-col h-[600px] overflow-hidden">
              {selectedTicket ? (
                <>
                  <div className="p-4 bg-base border-b border-stroke-muted flex justify-between items-center">
                    <div>
                      <div className="text-[1.2rem] text-muted">
                        <strong className="text-bright">{selectedTicket.tenantName}</strong> · Owner: {selectedTicket.creatorName} ({selectedTicket.creatorEmail})
                      </div>
                      <h3 className="text-[1.8rem] font-bold text-bright">{selectedTicket.subject}</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="bg-base-tint border border-stroke-medium text-[1.2rem] text-bright font-bold px-2.5 py-1.5 rounded-lg"
                      >
                        <option value="open">Status: Open</option>
                        <option value="in_progress">Status: In Progress</option>
                        <option value="resolved">Status: Resolved</option>
                        <option value="closed">Status: Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-base">
                    {selectedTicket.messages.map((m: any, idx: number) => {
                      const isStaff = m.senderRole === "super_admin" || m.senderRole === "platform_support";
                      return (
                        <div key={idx} className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[48rem] p-4 rounded-2xl text-[1.4rem] space-y-1 ${
                              isStaff ? "bg-accent text-white rounded-tr-none" : "bg-base text-bright rounded-tl-none border border-stroke-medium"
                            }`}
                          >
                            <div className="flex justify-between items-center text-[1.2rem] opacity-75 border-b pb-1 mb-1 border-current">
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
                  <form onSubmit={handleSendReply} className="p-4 bg-base-tint border-t border-stroke-muted flex space-x-3">
                    <input
                      type="text"
                      placeholder="Type response to tenant admin..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 px-4 py-2 bg-base border border-stroke-muted rounded-xl text-[1.4rem] text-bright focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                    <button
                      type="submit"
                      disabled={replying}
                      className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2 rounded-xl text-[1.4rem] flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center space-y-2">
                  <MessageSquare className="w-12 h-12 text-muted" />
                  <p className="text-[1.4rem]">Select a support ticket to view conversation thread and respond</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Broadcast Announcements */}
        {activeTab === "announcements" && (
          <div className="bg-base-tint border border-stroke-muted rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-bright text-[1.6rem]">Active Broadcast Announcements</h3>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 bg-base border border-stroke-muted rounded-xl flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-bright text-[1.4rem]">{a.title}</h4>
                    <p className="text-[1.2rem] text-muted mt-1">{a.content}</p>
                    <div className="text-[10px] text-muted mt-2">Posted: {new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className="bg-purple-600/20 text-purple-600 text-[1.2rem] font-bold px-2.5 py-1 rounded border border-purple-500/30 uppercase">
                    {a.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Broadcast Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-base-tint border border-stroke-muted text-bright max-w-[48rem] w-full p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-[1.8rem] border-b border-stroke-muted pb-3">Broadcast Platform Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled System Maintenance on Sunday"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                  required
                />
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Type</label>
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="feature">New Feature</option>
                </select>
              </div>

              <div>
                <label className="block text-[1.2rem] font-bold text-muted uppercase mb-1">Content</label>
                <textarea
                  rows={3}
                  placeholder="Announcement details visible on tenant dashboards..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 bg-base border border-stroke-muted rounded-lg text-[1.4rem] text-bright"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 bg-base hover:bg-accent-subtle text-medium rounded-lg text-[1.4rem] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[1.4rem] font-bold"
                >
                  Broadcast Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
