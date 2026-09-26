"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Stethoscope,
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit,
  DollarSign,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  registrationNumber?: string;
  photo?: string;
  fees: {
    newPatient: number;
    followUp: number;
    emergency: number;
  };
  hospitalCommissionPercent: number;
  paymentArrangement: string;
  availableDays: string[];
  status: "active" | "inactive";
  createdAt: string;
}

export default function DoctorManagementPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Doctor Form State
  const [form, setForm] = useState({
    name: "",
    specialization: "General Physician",
    registrationNumber: "",
    photo: "",
    newPatientFee: 2000,
    followUpFee: 1000,
    emergencyFee: 3000,
    hospitalCommissionPercent: 20,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const specializations = [
    "General Physician",
    "Cardiologist",
    "Dentist",
    "Neurologist",
    "Pediatrician",
    "Gynecologist",
    "Orthopedic Surgeon",
    "Dermatologist",
    "ENT Specialist",
    "Psychiatrist",
  ];

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch("/api/doctors");
      const data = await res.json();
      if (data.success) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error("Failed to fetch doctors", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  function handleOpenAddModal() {
    setEditingDoctor(null);
    setForm({
      name: "",
      specialization: "General Physician",
      registrationNumber: "",
      photo: "",
      newPatientFee: 2000,
      followUpFee: 1000,
      emergencyFee: 3000,
      hospitalCommissionPercent: 20,
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    });
    setErrorMsg("");
    setShowAddModal(true);
  }

  function handleOpenEditModal(doctor: Doctor) {
    setEditingDoctor(doctor);
    setForm({
      name: doctor.name,
      specialization: doctor.specialization,
      registrationNumber: doctor.registrationNumber || "",
      photo: doctor.photo || "",
      newPatientFee: doctor.fees.newPatient || 2000,
      followUpFee: doctor.fees.followUp || 1000,
      emergencyFee: doctor.fees.emergency || 3000,
      hospitalCommissionPercent: doctor.hospitalCommissionPercent || 20,
      availableDays: doctor.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    });
    setErrorMsg("");
    setShowAddModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        specialization: form.specialization,
        registrationNumber: form.registrationNumber,
        photo: form.photo,
        fees: {
          newPatient: Number(form.newPatientFee),
          followUp: Number(form.followUpFee),
          emergency: Number(form.emergencyFee),
        },
        hospitalCommissionPercent: Number(form.hospitalCommissionPercent),
        availableDays: form.availableDays,
      };

      const url = editingDoctor ? `/api/doctors/${editingDoctor._id}` : "/api/doctors";
      const method = editingDoctor ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save doctor information");
      }

      setShowAddModal(false);
      fetchDoctors();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(doctor: Doctor) {
    const newStatus = doctor.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/doctors/${doctor._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchDoctors();
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  }

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.registrationNumber && doc.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Hospital Doctors & Specialist Roster
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Manage hospital medical staff, doctor consultation fee schedules, PMDC registration IDs, and revenue share commissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDoctors}
            className="btn btn-secondary py-3 px-4 text-[1.3rem]"
            title="Refresh Doctors List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary py-3 px-6 text-[1.3rem]"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Doctor</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[20rem] flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctor by name, specialization, or PMDC number..."
            className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
          />
        </div>

        <span className="font-accent text-[1.2rem] text-muted border border-stroke-muted px-3 py-2 bg-base-bright">
          {filteredDoctors.length} Doctors Registered
        </span>
      </div>

      {/* Doctors Data Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doctor Profile</th>
              <th>Specialization</th>
              <th>PMDC Reg #</th>
              <th>Fee Schedule (PKR)</th>
              <th>Hospital Cut</th>
              <th>Available Days</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  Loading doctor directory from database...
                </td>
              </tr>
            ) : filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  No doctors found. Click "Add New Doctor" to register one.
                </td>
              </tr>
            ) : (
              filteredDoctors.map((doc) => (
                <tr key={doc._id} className={doc.status === "inactive" ? "opacity-60 bg-red-500/5" : ""}>
                  <td className="font-bold text-bright">
                    <div className="flex items-center gap-3">
                      {doc.photo ? (
                        <Image
                          src={doc.photo}
                          alt={doc.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 object-cover border border-blue-500/50"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-accent/20 border border-accent/40 text-accent font-accent font-bold flex items-center justify-center text-[1.2rem]">
                          {doc.name.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-[1.4rem] text-bright">{doc.name}</div>
                        <div className="text-[1.1rem] font-accent text-muted font-normal">
                          {doc.specialization}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="badge badge-accent font-accent uppercase text-[1.1rem]">
                      {doc.specialization}
                    </span>
                  </td>

                  <td className="font-accent text-bright font-semibold">
                    {doc.registrationNumber ? (
                      <span className="text-blue-300 font-mono">PMDC: {doc.registrationNumber}</span>
                    ) : (
                      <span className="text-muted italic">N/A</span>
                    )}
                  </td>

                  <td>
                    <div className="font-accent text-[1.2rem] space-y-0.5">
                      <div className="text-emerald-400 font-bold">
                        New Patient: PKR {doc.fees.newPatient.toLocaleString()}
                      </div>
                      <div className="text-gray-300">
                        Follow-up: PKR {doc.fees.followUp.toLocaleString()}
                      </div>
                    </div>
                  </td>

                  <td className="font-accent font-bold text-amber-400">
                    {doc.hospitalCommissionPercent}% Commission
                  </td>

                  <td>
                    <div className="flex flex-wrap gap-1">
                      {doc.availableDays?.map((day) => (
                        <span key={day} className="text-[1rem] bg-base-bright border border-stroke-muted px-1.5 py-0.5 text-gray-300 font-accent font-semibold">
                          {day}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td>
                    {doc.status === "active" ? (
                      <span className="badge badge-success flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="badge badge-error flex items-center gap-1">
                        <UserX className="w-3 h-3" /> INACTIVE
                      </span>
                    )}
                  </td>

                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(doc)}
                        className="p-1.5 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30"
                        title="Edit Doctor Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(doc)}
                        className={`p-1.5 border transition-colors ${
                          doc.status === "active"
                            ? "text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        }`}
                        title={doc.status === "active" ? "Deactivate Doctor" : "Activate Doctor"}
                      >
                        {doc.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#171719] border border-blue-500/50 w-full max-w-xl p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2 text-blue-400 font-accent font-extrabold text-[1.5rem] uppercase">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <span>{editingDoctor ? "Edit Doctor Profile" : "Register New Doctor"}</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 p-3 text-[1.2rem]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name & Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dr. Ahmed Khan"
                    className="w-full bg-[#0b0b0d] border border-gray-700 text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Specialization *</label>
                  <select
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full bg-[#0b0b0d] border border-gray-700 text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    {specializations.map((spec) => (
                      <option key={spec} value={spec} className="bg-[#0b0b0d]">
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PMDC Reg # & Photo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">PMDC Registration #</label>
                  <input
                    type="text"
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    placeholder="e.g. PMDC-88492-P"
                    className="w-full bg-[#0b0b0d] border border-gray-700 text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Doctor Photo URL / Avatar</label>
                  <input
                    type="text"
                    value={form.photo}
                    onChange={(e) => setForm({ ...form, photo: e.target.value })}
                    placeholder="https://example.com/dr-photo.jpg"
                    className="w-full bg-[#0b0b0d] border border-gray-700 text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Consultation Fees Schedule */}
              <div className="border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                <p className="font-accent text-[1.2rem] text-emerald-400 font-bold uppercase flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Consultation Fee Schedule (PKR)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">New Patient Fee *</label>
                    <input
                      type="number"
                      required
                      value={form.newPatientFee}
                      onChange={(e) => setForm({ ...form, newPatientFee: Number(e.target.value) })}
                      placeholder="2000"
                      className="w-full bg-[#0b0b0d] border border-gray-700 text-emerald-400 font-bold px-3 py-2 text-[1.5rem] outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Follow-up Fee</label>
                    <input
                      type="number"
                      value={form.followUpFee}
                      onChange={(e) => setForm({ ...form, followUpFee: Number(e.target.value) })}
                      placeholder="1000"
                      className="w-full bg-[#0b0b0d] border border-gray-700 text-emerald-400 font-bold px-3 py-2 text-[1.5rem] outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[rgba(255,255,255,0.6)]">Emergency Fee</label>
                    <input
                      type="number"
                      value={form.emergencyFee}
                      onChange={(e) => setForm({ ...form, emergencyFee: Number(e.target.value) })}
                      placeholder="3000"
                      className="w-full bg-[#0b0b0d] border border-gray-700 text-emerald-400 font-bold px-3 py-2 text-[1.5rem] outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Revenue Share Commission */}
              <div>
                <label className="form-label text-[rgba(255,255,255,0.6)]">
                  Hospital Revenue Commission Cut (%)
                </label>
                <input
                  type="number"
                  value={form.hospitalCommissionPercent}
                  onChange={(e) => setForm({ ...form, hospitalCommissionPercent: Number(e.target.value) })}
                  placeholder="20"
                  className="w-full bg-[#0b0b0d] border border-gray-700 text-amber-400 font-bold px-3 py-2 text-[1.5rem] outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[1.1rem] text-gray-400 font-accent mt-1 block">
                  Hospital keeps {form.hospitalCommissionPercent}%, Doctor receives {100 - (form.hospitalCommissionPercent || 0)}%
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn btn-secondary py-3 bg-[#0b0b0d] text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn btn-primary py-3 bg-[#002bba] text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingDoctor ? "Update Doctor" : "Register Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
