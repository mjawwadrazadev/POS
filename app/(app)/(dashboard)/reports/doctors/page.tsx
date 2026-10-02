"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

interface DoctorTotals {
  name: string;
  specialization: string;
  consultationsCount: number;
  totalRevenue: number;
}

export default function DoctorRevenueReportPage() {
  const [doctorTotals, setDoctorTotals] = useState<DoctorTotals[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConsultationBills() {
    setLoading(true);
    try {
      const res = await fetch("/api/consultations?summary=doctor");
      const data = await res.json();
      if (data.success) {
        setDoctorTotals(data.doctors);
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

  // Hospital keeps 20% by default; the doctor is paid the other 80%
  const doctorList = doctorTotals.map((d) => ({
    ...d,
    hospitalCut: d.totalRevenue * 0.2,
    doctorPayout: d.totalRevenue * 0.8,
  }));
  const grandTotalRevenue = doctorList.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalConsultations = doctorList.reduce((sum, d) => sum + d.consultationsCount, 0);

  return (
    <div className="space-y-6">
      <PageActions>
        <button
          onClick={fetchConsultationBills}
          className="btn btn-secondary py-2.5 px-4 text-[1.3rem]"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </PageActions>

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
