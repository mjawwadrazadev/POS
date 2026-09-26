"use client";

import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Receipt, AlertCircle } from "lucide-react";
import { ThermalReceiptModal } from "@/components/pos/ThermalReceiptModal";

interface DoctorOption {
  _id: string;
  name: string;
  specialization: string;
  fees: { newPatient: number; followUp: number; emergency: number };
}

type VisitType = "new_patient" | "follow_up" | "emergency";

const VISIT_LABELS: Record<VisitType, string> = {
  new_patient: "New Patient",
  follow_up: "Follow-up",
  emergency: "Emergency",
};

export default function ConsultationBillingPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("new_patient");
  const [fee, setFee] = useState<number>(0);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("male");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "wallet">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastBill, setLastBill] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/doctors?status=active")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDoctors(d.doctors || []);
          if (d.doctors?.[0]) setDoctorId(d.doctors[0]._id);
        }
      })
      .catch(() => setError("Failed to load doctors"));
  }, []);

  const doctor = useMemo(() => doctors.find((d) => d._id === doctorId), [doctors, doctorId]);

  // Default the fee from the doctor's schedule whenever doctor or visit type changes
  useEffect(() => {
    if (!doctor) return;
    const map = { new_patient: doctor.fees.newPatient, follow_up: doctor.fees.followUp, emergency: doctor.fees.emergency };
    setFee(map[visitType] || 0);
  }, [doctor, visitType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          visitType,
          feeCharged: fee,
          patientName,
          patientPhone,
          patientAge: patientAge ? Number(patientAge) : undefined,
          patientGender,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create consultation bill");
      setLastBill(data.bill);
      setPatientName("");
      setPatientPhone("");
      setPatientAge("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-base-tint border border-stroke-muted p-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-cyan-400" />
          <h2 className="font-extrabold text-[2.2rem] text-bright">Consultation Billing</h2>
        </div>
        <p className="text-medium text-[1.4rem] mt-1">Issue a patient token (perchi) and receipt for a doctor consultation.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 font-accent text-[1.3rem] flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {doctors.length === 0 ? (
        <div className="bg-base-bright border border-stroke-muted p-8 text-center text-muted font-accent text-[1.3rem]">
          No active doctors. Add doctors in the Doctor Directory first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-base-bright border border-stroke-muted p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Doctor *</label>
            <select className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Visit type</label>
            <select className="form-select" value={visitType} onChange={(e) => setVisitType(e.target.value as VisitType)}>
              {(Object.keys(VISIT_LABELS) as VisitType[]).map((v) => (
                <option key={v} value={v}>{VISIT_LABELS[v]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Patient name *</label>
            <input className="form-input" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="form-input" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Age</label>
            <input className="form-input" type="number" min={0} max={130} value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Gender</label>
            <select className="form-select" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Fee (PKR) *</label>
            <input className="form-input" type="number" min={1} required value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Payment method</label>
            <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting || !doctorId} className="btn btn-primary py-3 px-6 text-[1.4rem] flex items-center gap-2 disabled:opacity-50">
              <Receipt className="w-4 h-4" />
              {submitting ? "Generating..." : `Generate Receipt — PKR ${Number(fee || 0).toLocaleString()}`}
            </button>
          </div>
        </form>
      )}

      <ThermalReceiptModal
        isOpen={!!lastBill}
        onClose={() => setLastBill(null)}
        orderNumber={lastBill?.receiptNumber || ""}
        dateStr={new Date(lastBill?.createdAt || Date.now()).toLocaleString("en-PK")}
        cashierName={lastBill?.receptionistName || ""}
        customerName={lastBill?.patientName || ""}
        items={
          lastBill
            ? [{ name: `Consultation — ${VISIT_LABELS[lastBill.visitType as VisitType]}`, sku: "OPD", quantity: 1, unitPrice: lastBill.feeCharged, total: lastBill.feeCharged }]
            : []
        }
        subtotal={lastBill?.feeCharged || 0}
        taxAmount={0}
        discountTotal={0}
        grandTotal={lastBill?.feeCharged || 0}
        paymentMethod={lastBill?.paymentMethod || "cash"}
        branchName=""
        isHospitalBill
        perchiNumber={lastBill?.perchiNumber}
        consultationTime={lastBill?.consultationTime}
        doctorName={lastBill?.doctorNameSnapshot}
        doctorSpecialization={lastBill?.doctorSpecializationSnapshot}
        visitType={lastBill?.visitType}
        patientPhone={lastBill?.patientPhone}
        patientAge={lastBill?.patientAge}
        patientGender={lastBill?.patientGender}
      />
    </div>
  );
}
