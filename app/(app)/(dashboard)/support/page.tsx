"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Plus, MessageSquare, Send, X, Loader2 } from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

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
    } catch {
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
    } catch {
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
    } catch {
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const statusBadge = (status: string) =>
    status === "open" ? "badge-warning" : status === "in_progress" ? "badge-accent" : "badge-success";

  const darkField =
    "w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-white text-[1.4rem] px-3 py-2.5 outline-none focus:border-[#819ffe]";
  const darkLabel = "block font-accent text-[1.15rem] uppercase text-gray-300 font-semibold mb-1.5";

  return (
    <div className="space-y-6">
      <PageActions>
        <button onClick={() => setShowModal(true)} className="btn btn-primary py-2.5 px-5 text-[1.3rem]">
          <Plus className="w-4 h-4" /> New Support Ticket
        </button>
      </PageActions>

      <p className="text-[1.35rem] text-medium">
        Tickets go straight to the RST POS platform team. Replies show up in the conversation on the right.
      </p>

      {/* Tickets & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-base-bright border border-stroke-muted overflow-hidden flex flex-col h-[60rem]">
          <div className="px-4 py-3.5 border-b border-stroke-muted bg-base-tint font-bold text-[1.45rem] flex items-center justify-between">
            <span>Your tickets</span>
            <span className="badge badge-accent">{tickets.length}</span>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-muted text-[1.35rem]">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-muted text-[1.35rem]">
                No tickets yet. Need help? Click &quot;New Support Ticket&quot;.
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicketDetail(t.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-stroke-muted border-l-4 transition-colors flex flex-col gap-1.5 ${
                    selectedTicket?.id === t.id ? "bg-accent-subtle border-l-accent" : "border-l-transparent hover:bg-base-tint"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-accent font-bold text-accent text-[1.2rem]">{t.ticketNumber}</span>
                    <span className={`badge ${statusBadge(t.status)}`}>{t.status.replace("_", " ")}</span>
                  </div>
                  <h4 className="font-bold text-bright text-[1.4rem] truncate">{t.subject}</h4>
                  <div className="flex justify-between items-center text-[1.2rem] text-muted">
                    <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t.messageCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Conversation Detail Pane */}
        <div className="lg:col-span-2 bg-base-bright border border-stroke-muted flex flex-col h-[60rem] overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="px-5 py-4 border-b border-stroke-muted bg-base-tint flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[1.2rem]">
                    <span className="font-accent font-bold text-accent">{selectedTicket.ticketNumber}</span>
                    <span className="text-muted capitalize">· {String(selectedTicket.category).replace("_", " ")}</span>
                  </div>
                  <h3 className="text-[1.7rem] font-bold text-bright mt-1 truncate">{selectedTicket.subject}</h3>
                </div>
                <span className={`badge ${statusBadge(selectedTicket.status)}`}>{selectedTicket.status.replace("_", " ")}</span>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-base-tint/50">
                {selectedTicket.messages.map((m: any, idx: number) => {
                  const isStaff = m.senderRole === "super_admin" || m.senderRole === "platform_support";
                  return (
                    <div key={idx} className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}>
                      <div
                        className={`max-w-[56rem] px-4 py-3 text-[1.4rem] space-y-1.5 border ${
                          isStaff ? "bg-base-bright border-stroke-muted text-bright" : "bg-accent border-accent text-white"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 text-[1.15rem] opacity-75">
                          <span className="font-bold">{m.senderName} ({isStaff ? "Platform support" : "You"})</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendReply} className="p-4 border-t border-stroke-muted flex gap-3">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="form-input flex-1"
                  required
                />
                <button type="submit" disabled={replying} className="btn btn-primary py-2.5 px-5 text-[1.3rem] disabled:opacity-50">
                  {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{replying ? "Sending..." : "Reply"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center gap-3">
              <div className="w-14 h-14 bg-base-tint border border-stroke-muted flex items-center justify-center">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <p className="text-[1.4rem]">Select a ticket on the left to see the conversation.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-[rgba(255,255,255,0.12)] max-w-[56rem] w-full text-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
              <h2 className="font-accent font-extrabold text-[1.5rem] uppercase flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#819ffe]" /> New Support Ticket
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className={darkLabel}>Subject</label>
                <input
                  type="text"
                  placeholder="Short summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={darkField}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={darkLabel}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={darkField}>
                    <option value="technical">Technical bug</option>
                    <option value="billing">Billing & payment</option>
                    <option value="feature_request">Feature request</option>
                    <option value="general">General support</option>
                  </select>
                </div>
                <div>
                  <label className={darkLabel}>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={darkField}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={darkLabel}>Message</label>
                <textarea
                  rows={5}
                  placeholder="Describe your issue or request in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={darkField}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-gray-300 hover:text-white py-2.5 px-4 text-[1.3rem]"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary py-2.5 px-5 text-[1.3rem] disabled:opacity-50">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
