"use client";

import { useCallback, useState, useEffect } from "react";
import { useSessionUser } from "@/components/layout/SessionContext";
import { isStoreManagerRole } from "@/lib/auth/permissions";
import {
  Users,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  UserCheck,
  Timer,
  X,
  Loader2,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

interface AttendanceRecord {
  _id: string;
  userName: string;
  userRole: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  status: string;
  notes?: string;
}

interface PayrollEntry {
  userName: string;
  userRole: string;
  baseSalary: number;
  commissionEarned: number;
  deductions: number;
  netPay: number;
}

interface PayrollRunRecord {
  _id: string;
  month: string;
  entries: PayrollEntry[];
  totalPayroll: number;
  status: "draft" | "approved" | "paid";
  approvedBy?: string;
  paidAt?: string;
}

export default function HrPayrollPage() {
  const sessionUser = useSessionUser();
  const canManagePayroll = isStoreManagerRole(sessionUser?.role);
  const [activeTab, setActiveTab] = useState<"attendance" | "payroll">("attendance");
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [payrollList, setPayrollList] = useState<PayrollRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Clock-in/out form state
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [clockAction, setClockAction] = useState<"clock_in" | "clock_out">("clock_in");
  const [staffPin, setStaffPin] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Payroll form state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const attRes = await fetch("/api/hr/attendance");
      const attData = await attRes.json();
      if (attData.success && attData.attendanceLogs) {
        setAttendanceList(attData.attendanceLogs);
      }

      // Payroll figures are for managers only; cashiers just use the clock-in terminal
      if (canManagePayroll) {
        const payRes = await fetch("/api/hr/payroll");
        const payData = await payRes.json();
        if (payData.success && payData.payrolls) {
          setPayrollList(payData.payrolls);
        }
      }
    } catch (err) {
      console.error("Failed to load HR data", err);
    } finally {
      setLoading(false);
    }
  }, [canManagePayroll]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!staffPin || staffPin.length !== 4) {
      setErrorMsg("Please enter a valid 4-digit staff PIN.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: clockAction,
          pin: staffPin,
          notes: staffNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setSuccessMsg(data.message);
      setIsClockModalOpen(false);
      setStaffPin("");
      setStaffNotes("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate payroll");

      setSuccessMsg(data.message);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPayrollPaid = async (payrollId: string) => {
    if (!confirm("Are you sure you want to approve & mark this payroll as PAID? This will automatically post a Salary Expense entry to the double-entry accounting ledger.")) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollId,
          status: "paid",
          approvedBy: "Store Owner",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setSuccessMsg(data.message);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onShiftCount = attendanceList.filter((log) => !log.clockOut).length;
  const totalHoursLogged = attendanceList.reduce((sum, log) => sum + (log.totalHours || 0), 0);

  const openClockModal = (action: "clock_in" | "clock_out") => {
    setErrorMsg("");
    setClockAction(action);
    setStaffPin("");
    setIsClockModalOpen(true);
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <PageActions>
        <button onClick={fetchData} className="btn btn-secondary py-2.5 px-4 text-[1.2rem]" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button onClick={() => openClockModal("clock_in")} className="btn btn-primary py-2.5 px-5 text-[1.3rem]">
          <Clock className="w-4 h-4" /> Staff Clock-In / Out
        </button>
      </PageActions>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">On shift now</span>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">{onShiftCount}</div>
          <span className="text-[1.2rem] text-muted">Clocked in and not yet out</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Attendance records</span>
            <div className="w-10 h-10 bg-accent-subtle text-accent flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">{attendanceList.length}</div>
          <span className="text-[1.2rem] text-muted">Clock-ins in the log below</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-card__label">Hours logged</span>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <div className="stat-card__value">{Math.round(totalHoursLogged * 10) / 10}</div>
          <span className="text-[1.2rem] text-muted">From completed shifts</span>
        </div>
      </div>

      {/* Tabs */}
      {canManagePayroll && (
        <div className="inline-flex bg-base-bright border border-stroke-muted p-1 font-accent text-[1.3rem]">
          {([
            ["attendance", "Attendance", Clock, attendanceList.length],
            ["payroll", "Payroll", DollarSign, payrollList.length],
          ] as const).map(([key, label, Icon, count]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 font-bold uppercase flex items-center gap-2 transition-colors ${
                activeTab === key ? "bg-accent text-white" : "text-medium hover:text-bright"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
              <span className={activeTab === key ? "text-white/70" : "text-muted"}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-4 py-3 text-[1.35rem]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && !isClockModalOpen && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 px-4 py-3 text-[1.35rem]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ATTENDANCE LOG */}
      {activeTab === "attendance" && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Date</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-14 h-14 bg-base-tint border border-stroke-muted flex items-center justify-center">
                        <Clock className="w-6 h-6 text-muted" />
                      </div>
                      <p className="font-bold text-[1.5rem]">No attendance yet</p>
                      <p className="text-muted text-[1.3rem] max-w-[40rem]">
                        Staff clock in with their 4-digit PIN at the start of a shift and clock out at the end.
                      </p>
                      <button onClick={() => openClockModal("clock_in")} className="btn btn-primary py-2.5 px-5 text-[1.3rem] mt-1">
                        <Clock className="w-4 h-4" /> Clock in a staff member
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                attendanceList.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="font-bold">{log.userName}</div>
                      <div className="text-[1.15rem] text-muted uppercase font-accent">{log.userRole}</div>
                    </td>
                    <td className="text-medium">{new Date(log.clockIn).toLocaleDateString()}</td>
                    <td className="font-semibold text-emerald-700">{formatTime(log.clockIn)}</td>
                    <td className="font-semibold">
                      {log.clockOut ? <span className="text-rose-600">{formatTime(log.clockOut)}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="font-bold">{log.totalHours ? `${log.totalHours} hrs` : "—"}</td>
                    <td>
                      {log.clockOut ? (
                        <span className="badge bg-base-tint text-medium">Completed</span>
                      ) : (
                        <span className="badge badge-success">On shift</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYROLL */}
      {canManagePayroll && activeTab === "payroll" && (
        <div className="space-y-6">
          <div className="bg-base-bright border border-stroke-muted p-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-bold text-[1.6rem] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" /> Generate monthly payroll
              </h3>
              <p className="text-muted text-[1.3rem] mt-1">
                Builds a draft from each staff member&apos;s base salary, commission and deductions for the month.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="form-label">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="form-input py-2.5"
                />
              </div>
              <button disabled={actionLoading} onClick={handleGeneratePayroll} className="btn btn-primary py-3 px-5 text-[1.3rem] disabled:opacity-50">
                {actionLoading ? "Generating..." : "Generate Draft"}
              </button>
            </div>
          </div>

          {payrollList.length === 0 && (
            <div className="bg-base-bright border border-stroke-muted p-10 text-center text-muted text-[1.4rem]">
              No payroll runs yet. Pick a month above and generate a draft.
            </div>
          )}

          {payrollList.map((run) => (
            <div key={run._id} className="data-table-wrapper">
              <div className="px-5 py-4 border-b border-stroke-muted flex flex-wrap justify-between items-center gap-3 bg-base-tint">
                <div>
                  <h4 className="text-[1.6rem] font-bold">Payroll · {run.month}</h4>
                  <p className="text-muted text-[1.3rem] mt-0.5">
                    Total payout <b className="text-emerald-700">PKR {run.totalPayroll.toLocaleString()}</b>
                  </p>
                </div>
                {run.status === "paid" ? (
                  <span className="badge badge-success flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid · posted to ledger
                  </span>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleMarkPayrollPaid(run._id)}
                    className="btn btn-success py-2.5 px-4 text-[1.2rem] disabled:opacity-50"
                  >
                    Approve & mark paid
                  </button>
                )}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th>Base salary</th>
                    <th>Commission</th>
                    <th>Deductions</th>
                    <th className="!text-right">Net salary</th>
                  </tr>
                </thead>
                <tbody>
                  {run.entries.map((entry, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="font-bold">{entry.userName}</div>
                        <div className="text-[1.15rem] text-muted uppercase font-accent">{entry.userRole}</div>
                      </td>
                      <td>PKR {entry.baseSalary.toLocaleString()}</td>
                      <td className="text-emerald-700">+ PKR {entry.commissionEarned.toLocaleString()}</td>
                      <td className="text-rose-600">− PKR {entry.deductions.toLocaleString()}</td>
                      <td className="text-right font-extrabold">PKR {entry.netPay.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* STAFF CLOCK-IN / OUT MODAL */}
      {isClockModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-[rgba(255,255,255,0.12)] w-full max-w-[44rem] text-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
              <h3 className="font-accent font-extrabold text-[1.5rem] uppercase flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#819ffe]" /> Staff Clock-In / Out
              </h3>
              <button onClick={() => setIsClockModalOpen(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClockSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 font-accent text-[1.3rem]">
                <button
                  type="button"
                  onClick={() => setClockAction("clock_in")}
                  className={`py-3 font-bold uppercase border transition-colors ${
                    clockAction === "clock_in"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-[#0b0b0d] text-gray-400 border-[rgba(255,255,255,0.12)] hover:text-white"
                  }`}
                >
                  Clock In
                </button>
                <button
                  type="button"
                  onClick={() => setClockAction("clock_out")}
                  className={`py-3 font-bold uppercase border transition-colors ${
                    clockAction === "clock_out"
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-[#0b0b0d] text-gray-400 border-[rgba(255,255,255,0.12)] hover:text-white"
                  }`}
                >
                  Clock Out
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 px-3 py-2.5 text-[1.3rem]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-accent text-[1.2rem] uppercase text-gray-300 font-semibold mb-2">Staff PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  maxLength={4}
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-white font-bold text-center text-[2.8rem] tracking-[0.6em] py-3 outline-none focus:border-[#819ffe]"
                  required
                />
              </div>

              <div>
                <label className="block font-accent text-[1.2rem] uppercase text-gray-300 font-semibold mb-2">Notes (optional)</label>
                <input
                  type="text"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g. Morning shift"
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-white text-[1.4rem] px-3 py-2.5 outline-none focus:border-[#819ffe]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsClockModalOpen(false)}
                  className="btn bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-gray-300 hover:text-white py-2.5 px-4 text-[1.3rem]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`btn py-2.5 px-5 text-[1.3rem] text-white disabled:opacity-50 ${
                    clockAction === "clock_in" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {actionLoading ? "Saving..." : clockAction === "clock_in" ? "Clock In" : "Clock Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
