"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Search,
  Pill,
  User,
  Stethoscope,
  FileText,
  Eye,
  CalendarClock,
} from "lucide-react";

interface FollowUp {
  id: string;
  followUpNumber: string;
  patientId: string;
  doctorId?: string;
  reason?: string;
  clinicalNotes?: string;
  completedAt?: string | null;
  encounterId?: string;
  patient?: { name: string };
  encounter?: {
    id: string;
    chiefComplaint?: string;
    diagnosisText?: string;
    diagnoses?: { description?: string }[];
  };
}

interface Patient {
  id: string;
  name: string;
  phone?: string;
}

interface Doctor {
  id: string;
  name: string;
}

interface Encounter {
  id: string;
  date: string;
  chiefComplaint: string;
  diagnosis: string;
}

interface Medicine {
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: string;
  instructions: string;
}

const defaultMedicine: Medicine = {
  name: "",
  strength: "",
  dosage: "",
  frequency: "OD",
  duration: "",
  route: "Oral",
  quantity: "",
  instructions: "",
};

const frequencyOptions = ["OD", "BD", "TID", "QID", "PRN", "STAT"];
const routeOptions = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled"];

export default function NewPrescriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const encounterId = searchParams.get("encounterId");
  const patientId = searchParams.get("patientId");
  const doctorId = searchParams.get("doctorId");
  const followUpId = searchParams.get("followUpId");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || "");
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounterId || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...defaultMedicine }]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followUpRef, setFollowUpRef] = useState<FollowUp | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchPatients(), fetchDoctors()]);
  }, []);

  useEffect(() => {
    if (patientId) {
      fetch(`/api/patients/${patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((patient) => {
          if (patient) {
            setSelectedPatientId(patient.id);
            setPatientSearch(patient.name);
          }
        })
        .catch(() => {});
    }
  }, [patientId]);

  useEffect(() => {
    if (followUpId) {
      fetch(`/api/follow-ups/${followUpId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((fu) => {
          if (!fu) return;
          setFollowUpRef(fu);
          if (fu.patientId) {
            setSelectedPatientId(fu.patientId);
            setPatientSearch(fu.patient?.name ?? "");
          }
          if (fu.doctorId) setSelectedDoctorId(fu.doctorId);
          if (fu.encounterId) setSelectedEncounterId(fu.encounterId);
        })
        .catch(() => {});
    }
  }, [followUpId]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientEncounters(selectedPatientId);
    } else {
      setEncounters([]);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    if (selectedEncounterId && encounters.length > 0) {
      const enc = encounters.find((e) => e.id === selectedEncounterId);
      if (enc?.diagnosis) {
        setDiagnosis(enc.diagnosis);
      }
    }
  }, [selectedEncounterId, encounters]);

  async function fetchPatients() {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch {}
  }

  async function fetchDoctors() {
    try {
      const res = await fetch("/api/doctors");
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch {}
  }

  async function fetchPatientEncounters(patientId: string) {
    try {
      const res = await fetch(`/api/encounters?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setEncounters(data.encounters || []);
      }
    } catch {
      setEncounters([]);
    }
  }

  const filteredPatients = patients.filter(
    (p) =>
      !patientSearch ||
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.includes(patientSearch)
  );

  function addMedicine() {
    setMedicines((prev) => [...prev, { ...defaultMedicine }]);
  }

  function removeMedicine(index: number) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPatientId || !selectedDoctorId) {
        alert("Please select a patient and doctor");
        return;
      }
      const validMedicines = medicines.filter((m) => m.name);
      if (validMedicines.length === 0) {
        alert("Please add at least one medicine");
        return;
      }
      setSubmitting(true);
      try {
        const payload = {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          encounterId: selectedEncounterId || undefined,
          diagnosis,
          items: validMedicines.map((m) => ({
            medicineName: m.name,
            strength: m.strength || undefined,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration || undefined,
            route: m.route || undefined,
            quantity: m.quantity ? Number(m.quantity) : undefined,
            instructions: m.instructions || undefined,
          })),
          notes,
          followUpId: followUpId || undefined,
        };
        const res = await fetch("/api/prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(`/prescriptions/${data.id}`);
        } else {
          const err = await res.json().catch(() => ({}));
          let msg = "Failed to create prescription";
          if (typeof err?.error === "string") {
            msg = err.error;
          } else if (err?.error && typeof err.error === "object") {
            msg = Object.entries(err.error)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join("\n");
          }
          alert(msg);
        }
      } catch {
        alert("Network error. Please try again.");
      }
      setSubmitting(false);
    },
    [
      selectedPatientId,
      selectedDoctorId,
      selectedEncounterId,
      diagnosis,
      medicines,
      notes,
      router,
    ]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/prescriptions"
            className="p-2 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Prescription
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Create a new prescription for a patient
            </p>
          </div>
        </div>

        {followUpRef && (
          <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock size={18} className="text-teal-600" />
              <h2 className="text-base font-semibold text-teal-900">
                Follow-up {followUpRef.followUpNumber || ""}
              </h2>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                {followUpRef.completedAt ? "Completed" : "Open"}
              </span>
            </div>
            <div className="grid gap-3 text-sm text-teal-900 sm:grid-cols-2">
              {followUpRef.reason && (
                <p>
                  <span className="font-medium">Reason: </span>
                  {followUpRef.reason}
                </p>
              )}
              {followUpRef.encounter?.diagnoses?.length ? (
                <p>
                  <span className="font-medium">Diagnosis: </span>
                  {(followUpRef.encounter?.diagnoses || [])
                    .map((d) => d.description)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : followUpRef.encounter?.diagnosisText ? (
                <p>
                  <span className="font-medium">Diagnosis: </span>
                  {followUpRef.encounter.diagnosisText}
                </p>
              ) : null}
              {followUpRef.clinicalNotes && (
                <p className="sm:col-span-2">
                  <span className="font-medium">Clinical notes: </span>
                  {followUpRef.clinicalNotes}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient, Doctor, Encounter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Patient & Doctor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search patient..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      if (!e.target.value) setSelectedPatientId("");
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {patientSearch && !selectedPatientId && filteredPatients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredPatients.slice(0, 10).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setPatientSearch(p.name);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                        >
                          <span>{p.name}</span>
                          {p.phone && (
                            <span className="text-gray-400 text-xs">{p.phone}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatientId && (
                  <p className="text-xs text-green-600 mt-1">
                    Patient selected: {patientSearch}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Encounter (optional)
                </label>
                <select
                  value={selectedEncounterId}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                  disabled={!selectedPatientId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">No encounter</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {new Date(enc.date).toLocaleDateString("en-IN")} -{" "}
                      {enc.chiefComplaint || "No complaint"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Diagnosis
            </h2>
            <textarea
              rows={2}
              placeholder="Enter diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Medicines */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill size={20} />
                Medicines
              </h2>
              <button
                type="button"
                onClick={addMedicine}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={16} />
                Add Medicine
              </button>
            </div>
            <div className="space-y-4">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Medicine #{idx + 1}
                    </span>
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicine(idx)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Amoxicillin"
                        value={med.name}
                        onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Strength
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 500mg"
                        value={med.strength}
                        onChange={(e) => updateMedicine(idx, "strength", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 1 tablet"
                        value={med.dosage}
                        onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Frequency *
                      </label>
                      <select
                        value={med.frequency}
                        onChange={(e) =>
                          updateMedicine(idx, "frequency", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {frequencyOptions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 7 days"
                        value={med.duration}
                        onChange={(e) =>
                          updateMedicine(idx, "duration", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Route
                      </label>
                      <select
                        value={med.route}
                        onChange={(e) => updateMedicine(idx, "route", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {routeOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Quantity
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 14"
                        value={med.quantity}
                        onChange={(e) =>
                          updateMedicine(idx, "quantity", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., After food"
                        value={med.instructions}
                        onChange={(e) =>
                          updateMedicine(idx, "instructions", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notes
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/prescriptions"
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? "Saving..." : "Save Prescription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
