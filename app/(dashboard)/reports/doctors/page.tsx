"use client";

import { useState, useEffect } from "react";
import {
  Stethoscope,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface ConsultationBill {
  _id: string;
  receiptNumber: string;
  perchiNumber: number;
  doctorNameSnapshot: string;
  doctorSpecializationSnapshot?: string;
  visitType: string;
  feeCharged: number;
  patientName: string;
  patientPhone?: string;
  paymentMethod: string;
  consultationTime: string;
  createdAt: string;
}

export default function DoctorRevenueReportPage() {
  const [bills, setBills] = useState<ConsultationBill[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConsultationBills() {
    setLoading(true);
    try {
      const res = await fetch("/api/consultations");
      const data = await res.json();
      if (data.success) {
        setBills(data.bills);
      }
    } catch (err) {
      console.error("Failed to fetch consultation report", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConsultationBills();
  }, []);

  // Doctor-wise Aggregates
  const doctorSummary = bills.reduce((acc, bill) => {
    const docName = bill.doctorNameSnapshot || "Unknown Doctor";
    if (!acc[docName]) {
      acc[docName] = {
        name: docName,
        specialization: bill.doctorSpecializationSnapshot || "Specialist",
        consultationsCount: 0,
        totalRevenue: 0,
        hospitalCut: 0,
        doctorPayout: 0,
      };
    }
    acc[docName].consultationsCount += 1;
    acc[docName].totalRevenue += bill.feeCharged;
    acc[docName].hospitalCut += bill.feeCharged * 0.2; // 20% default hospital share
    acc[docName].doctorPayout += bill.feeCharged * 0.8; // 80% default doctor share
    return acc;
  }, {} as Record<string, { name: string; specialization: string; consultationsCount: number; totalRevenue: number; hospitalCut: number; doctorPayout: number }>);

  const doctorList = Object.values(doctorSummary);
  const grandTotalRevenue = doctorList.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalConsultations = doctorList.reduce((sum, d) => sum + d.consultationsCount, 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Doctor-Wise Revenue & Consultation Report
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Track patient visit volumes, doctor consultation revenues, hospital share cuts, and doctor payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchConsultationBills}
            className="btn btn-secondary py-3 px-4 text-[1.3rem]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-emerald-500">
          <span className="stat-card__label">Total Consultation Revenue</span>
          <div className="stat-card__value text-emerald-400">
            PKR {grandTotalRevenue.toLocaleString()}
          </div>
          <div className="stat-card__trend positive">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{totalConsultations} Total Patient Visits</span>
          </div>
        </div>

        <div className="stat-card border-l-4 border-l-blue-500">
          <span className="stat-card__label">Hospital Share Cut (20%)</span>
          <div className="stat-card__value text-blue-400">
            PKR {(grandTotalRevenue * 0.2).toLocaleString()}
          </div>
          <div className="stat-card__trend positive">
            <span>Hospital Net Revenue</span>
          </div>
        </div>

        <div className="stat-card border-l-4 border-l-amber-500">
          <span className="stat-card__label">Doctor Payout Share (80%)</span>
          <div className="stat-card__value text-amber-400">
            PKR {(grandTotalRevenue * 0.8).toLocaleString()}
          </div>
          <div className="stat-card__trend warning">
            <span>Doctor Payable Balance</span>
          </div>
        </div>
      </div>

      {/* Doctor Breakdown Table */}
      <div className="space-y-4">
        <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
          Doctor-Wise Consultation Performance
        </h3>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Specialization</th>
                <th>Total Consultations</th>
                <th>Gross Revenue (PKR)</th>
                <th>Hospital Share (20%)</th>
                <th>Doctor Payout (80%)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                    Calculating doctor revenue analytics...
                  </td>
                </tr>
              ) : doctorList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                    No consultation bills found in database.
                  </td>
                </tr>
              ) : (
                doctorList.map((doc) => (
                  <tr key={doc.name}>
                    <td className="font-bold text-bright">{doc.name}</td>
                    <td>
                      <span className="badge badge-accent uppercase text-[1.1rem]">
                        {doc.specialization}
                      </span>
                    </td>
                    <td className="font-accent font-bold text-blue-300">
                      {doc.consultationsCount} Visits
                    </td>
                    <td className="font-accent font-bold text-emerald-400">
                      PKR {doc.totalRevenue.toLocaleString()}
                    </td>
                    <td className="font-accent font-bold text-blue-400">
                      PKR {doc.hospitalCut.toLocaleString()}
                    </td>
                    <td className="font-accent font-bold text-amber-400">
                      PKR {doc.doctorPayout.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
