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
} from "lucide-react";

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b0b0d] border border-gray-800 p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" /> Human Resources & Workforce
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
            Staff Attendance & Payroll Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage PIN clock-in/out attendance, shift durations, and monthly automated staff payroll.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono px-3 py-2 border border-gray-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => {
              setErrorMsg("");
              setClockAction("clock_in");
              setIsClockModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#002bba] hover:bg-blue-700 text-white text-xs font-mono px-4 py-2 uppercase tracking-wider transition font-bold"
          >
            <Clock className="w-4 h-4" /> Staff Clock-In / Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 font-mono text-xs">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-5 py-3 font-bold uppercase transition flex items-center gap-2 border-b-2 ${
            activeTab === "attendance"
              ? "border-[#002bba] text-white bg-gray-900/60"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" /> Attendance Logs ({attendanceList.length})
        </button>
        {canManagePayroll && (
        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-5 py-3 font-bold uppercase transition flex items-center gap-2 border-b-2 ${
            activeTab === "payroll"
              ? "border-[#002bba] text-white bg-gray-900/60"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" /> Monthly Payroll Runner ({payrollList.length})
        </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-4 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE LOGS */}
      {activeTab === "attendance" && (
        <div className="bg-[#0b0b0d] border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Staff Attendance & Shift Duration Records
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-4">Staff Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Clock In</th>
                  <th className="p-4">Clock Out</th>
                  <th className="p-4">Total Hours</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No staff attendance records logged today. Click &quot;Staff Clock-In / Out&quot; to test.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-900/40 transition">
                      <td className="p-4 font-bold text-white">{log.userName}</td>
                      <td className="p-4 uppercase text-gray-300">{log.userRole}</td>
                      <td className="p-4 text-gray-400">
                        {new Date(log.clockIn).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-emerald-400 font-bold">
                        {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-rose-400 font-bold">
                        {log.clockOut
                          ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "IN SHIFT"}
                      </td>
                      <td className="p-4 text-white font-bold">
                        {log.totalHours ? `${log.totalHours} hrs` : "—"}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYROLL RUNNER */}
      {canManagePayroll && activeTab === "payroll" && (
        <div className="space-y-6">
          <div className="bg-[#0b0b0d] border border-gray-800 p-6 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Generate Monthly Staff Payroll
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-gray-400 mb-1">Select Payroll Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white p-2.5 outline-none font-bold"
                />
              </div>
              <button
                disabled={actionLoading}
                onClick={handleGeneratePayroll}
                className="mt-5 bg-[#002bba] hover:bg-blue-700 text-white px-5 py-2.5 uppercase font-bold tracking-wider"
              >
                {actionLoading ? "Generating..." : "Generate Payroll Draft"}
              </button>
            </div>
          </div>

          {payrollList.map((run) => (
            <div key={run._id} className="bg-[#0b0b0d] border border-gray-800 overflow-hidden font-mono text-xs">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/60">
                <div>
                  <h4 className="text-base font-bold text-white uppercase">
                    Payroll Month: {run.month}
                  </h4>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Total Payroll Payout: <b className="text-emerald-400">PKR {run.totalPayroll.toLocaleString()}</b>
                  </p>
                </div>
                <div>
                  {run.status === "paid" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PAID & LEDGER POSTED
                    </span>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleMarkPayrollPaid(run._id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 uppercase font-bold tracking-wider"
                    >
                      Approve & Mark Paid (Post Ledger)
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Base Salary</th>
                      <th className="p-4">Commission</th>
                      <th className="p-4">Deductions</th>
                      <th className="p-4 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {run.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40">
                        <td className="p-4 font-bold text-white">{entry.userName}</td>
                        <td className="p-4 uppercase text-gray-400">{entry.userRole}</td>
                        <td className="p-4 text-gray-300">PKR {entry.baseSalary.toLocaleString()}</td>
                        <td className="p-4 text-emerald-400">+ PKR {entry.commissionEarned.toLocaleString()}</td>
                        <td className="p-4 text-rose-400">- PKR {entry.deductions.toLocaleString()}</td>
                        <td className="p-4 text-right font-extrabold text-white text-sm">
                          PKR {entry.netPay.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STAFF CLOCK-IN / OUT MODAL */}
      {isClockModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-blue-500/50 w-full max-w-md p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-mono font-bold text-blue-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Staff Shift Kiosk Terminal
              </h3>
              <button onClick={() => setIsClockModalOpen(false)} className="text-gray-400 hover:text-white font-mono text-xs">
                [Close]
              </button>
            </div>

            <form onSubmit={handleClockSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setClockAction("clock_in")}
                  className={`py-2 font-bold uppercase border ${
                    clockAction === "clock_in"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-gray-900 text-gray-400 border-gray-800"
                  }`}
                >
                  Clock IN Shift
                </button>
                <button
                  type="button"
                  onClick={() => setClockAction("clock_out")}
                  className={`py-2 font-bold uppercase border ${
                    clockAction === "clock_out"
                      ? "bg-rose-700 text-white border-rose-600"
                      : "bg-gray-900 text-gray-400 border-gray-800"
                  }`}
                >
                  Clock OUT Shift
                </button>
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Enter 4-Digit Staff PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-gray-900 border border-gray-700 text-blue-400 font-mono font-bold text-center text-2xl py-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Shift Notes (Optional)</label>
                <input
                  type="text"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g. On-time morning shift check in"
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClockModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-[#002bba] hover:bg-blue-700 text-white px-5 py-2 uppercase font-bold"
                >
                  {actionLoading ? "Processing..." : `Submit ${clockAction.replace("_", " ")}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
