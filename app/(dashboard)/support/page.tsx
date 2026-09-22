"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle, Send, AlertCircle } from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export default function TenantSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Ticket Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");

  // Selected Ticket State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setSubject("");
        setMessage("");
        fetchTickets();
      } else {
        alert(data.error || "Failed to submit support ticket");
      }
    } catch (err) {
      alert("Error submitting ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/support/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
      }
    } catch (err) {
      alert("Failed to load ticket conversation");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        openTicketDetail(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Support & Help Desk</h1>
            <p className="text-sm text-gray-500">
              Submit support tickets directly to the RST POS Platform HQ technical team
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Raise New Support Ticket</span>
        </button>
      </div>

      {/* Tickets & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-800 text-sm flex items-center justify-between">
            <span>Your Support Tickets</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{tickets.length}</span>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No tickets submitted yet. Need help? Click "Raise New Support Ticket".
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicketDetail(t.id)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition flex flex-col space-y-1.5 ${
                    selectedTicket?.id === t.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="font-mono font-bold text-blue-600">{t.ticketNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        t.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : t.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm truncate">{t.subject}</h4>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t.messageCount}</span>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Conversation Detail Pane */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">Category: {selectedTicket.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedTicket.subject}</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedTicket.status === "open"
                      ? "bg-amber-100 text-amber-800"
                      : selectedTicket.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {selectedTicket.status}
                </span>
              </div>

              {/* Messages Thread */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-gray-50/50">
                {selectedTicket.messages.map((m: any, idx: number) => {
                  const isStaff = m.senderRole === "super_admin" || m.senderRole === "platform_support";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-lg p-4 rounded-xl shadow-sm text-sm space-y-1 ${
                          isStaff
                            ? "bg-white border border-gray-200 text-gray-900 rounded-tl-none"
                            : "bg-blue-600 text-white rounded-tr-none"
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs opacity-75 border-b pb-1 mb-1 border-current">
                          <span className="font-bold">{m.senderName} ({isStaff ? "Platform Support HQ" : "You"})</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 bg-white flex space-x-3">
                <input
                  type="text"
                  placeholder="Type your reply to platform support..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition text-sm shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{replying ? "Sending..." : "Reply"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-gray-300" />
              <p className="text-sm">Select a ticket from the left panel to view conversation thread and replies</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Submit Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Short summary of issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="technical">Technical Bug</option>
                    <option value="billing">Billing & Payment</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="general">General Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Detailed Message</label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue or request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
