"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Weight,
  Ruler,
  User,
  Stethoscope,
  Search,
  Pill,
  Receipt,
  CheckCircle,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";

interface FollowUp {
  id: string;
  followUpNumber: string;
  patientId: string;
  doctorId?: string;
  reason?: string;
  clinicalNotes?: string;
  completedAt?: string | null;
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
  dob?: string;
}

interface Doctor {
  id: string;
  name: string;
}

interface Diagnosis {
  code: string;
  description: string;
  isPrimary: boolean;
}

interface Treatment {
  description: string;
  notes: string;
}

interface ServiceItem {
  serviceId: string;
  quantity: number;
  notes: string;
}

interface CatalogService {
  id: string;
  name: string;
  category: string | null;
  price: number;
}

interface VitalSigns {
  systolic: string;
  diastolic: string;
  pulse: string;
  temperature: string;
  respiratoryRate: string;
  spo2: string;
  weight: string;
  height: string;
}

const defaultVitals: VitalSigns = {
  systolic: "",
  diastolic: "",
  pulse: "",
  temperature: "",
  respiratoryRate: "",
  spo2: "",
  weight: "",
  height: "",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function NewEncounterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");
  const followUpId = searchParams.get("followUpId");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [vitals, setVitals] = useState<VitalSigns>(defaultVitals);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [examination, setExamination] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([
    { code: "", description: "", isPrimary: true },
  ]);
  const [treatments, setTreatments] = useState<Treatment[]>([
    { description: "", notes: "" },
  ]);
  const [services, setServices] = useState<ServiceItem[]>([
    { serviceId: "", quantity: 1, notes: "" },
  ]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingAppt, setLoadingAppt] = useState(false);
  const [followUpRef, setFollowUpRef] = useState<FollowUp | null>(null);

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

  async function fetchServices() {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.services || []);
      }
    } catch {}
  }

  async function loadAppointment(id: string) {
    setLoadingAppt(true);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      if (res.ok) {
        const appt = await res.json();
        if (appt.patientId) setSelectedPatientId(appt.patientId);
        if (appt.doctorId) setSelectedDoctorId(appt.doctorId);
        if (appt.patientName) setPatientSearch(appt.patientName);
        if (appt.chiefComplaint) setChiefComplaint(appt.chiefComplaint);
      }
    } catch {}
    setLoadingAppt(false);
  }

  useEffect(() => {
    Promise.all([fetchPatients(), fetchDoctors(), fetchServices()]);
    if (appointmentId) {
      loadAppointment(appointmentId);
    }
  }, [appointmentId]);

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
          if (fu.reason) setChiefComplaint(fu.reason);
        })
        .catch(() => {});
    }
  }, [followUpId]);

  const filteredPatients = patients.filter(
    (p) =>
      !patientSearch ||
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.includes(patientSearch)
  );

  const bmi =
    vitals.weight && vitals.height
      ? (
          parseFloat(vitals.weight) /
          Math.pow(parseFloat(vitals.height) / 100, 2)
        ).toFixed(1)
      : "";

  function updateVital(field: keyof VitalSigns, value: string) {
    setVitals((prev) => ({ ...prev, [field]: value }));
  }

  function addDiagnosis() {
    setDiagnoses((prev) => [...prev, { code: "", description: "", isPrimary: false }]);
  }

  function removeDiagnosis(index: number) {
    setDiagnoses((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDiagnosis(index: number, field: keyof Diagnosis, value: string | boolean) {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  }

  function addTreatment() {
    setTreatments((prev) => [...prev, { description: "", notes: "" }]);
  }

  function removeTreatment(index: number) {
    setTreatments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTreatment(index: number, field: keyof Treatment, value: string) {
    setTreatments((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function addService() {
    setServices((prev) => [...prev, { serviceId: "", quantity: 1, notes: "" }]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateService(
    index: number,
    field: keyof ServiceItem,
    value: string | number
  ) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  const saveEncounter = useCallback(
    async (
      destination: "view" | "prescribe" | "bill" | "complete" | "followup" = "view"
    ) => {
      if (!selectedPatientId || !selectedDoctorId) {
        alert("Please select a patient and doctor");
        return;
      }
      setSubmitting(true);
      try {
        const payload = {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          appointmentId: appointmentId || undefined,
          status: "COMPLETED",
          vitalSigns: {
            bloodPressure: `${vitals.systolic}/${vitals.diastolic}`,
            pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
            temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
            respiratoryRate: vitals.respiratoryRate
              ? Number(vitals.respiratoryRate)
              : undefined,
            spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
            weight: vitals.weight ? Number(vitals.weight) : undefined,
            height: vitals.height ? Number(vitals.height) : undefined,
            bmi: bmi ? Number(bmi) : undefined,
          },
          chiefComplaint,
          historyOfPresentIllness: hpi,
          examinationFindings: examination,
          clinicalNotes,
          diagnoses: diagnoses.filter((d) => d.description),
          treatments: treatments.filter((t) => t.description),
          services: services
            .filter((s) => s.serviceId)
            .map((s) => ({
              serviceId: s.serviceId,
              quantity: s.quantity || 1,
              notes: s.notes || undefined,
            })),
          additionalInstructions,
          followUpId: followUpId || undefined,
        };

        const res = await fetch("/api/encounters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (destination === "prescribe") {
            router.push(
              `/prescriptions/new?patientId=${selectedPatientId}&encounterId=${data.id}&doctorId=${selectedDoctorId}`
            );
          } else if (destination === "bill") {
            router.push(
              `/billing/invoices/new?patientId=${selectedPatientId}&encounterId=${data.id}`
            );
          } else if (destination === "complete") {
            router.push(`/patients/${selectedPatientId}`);
          } else if (destination === "followup") {
            router.push(
              `/follow-ups/new?patientId=${selectedPatientId}&doctorId=${selectedDoctorId}&encounterId=${data.id}`
            );
          } else {
            router.push(`/emr/${data.id}`);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.message || "Failed to create encounter");
        }
      } catch {
        alert("Network error. Please try again.");
      }
      setSubmitting(false);
    },
    [
      selectedPatientId,
      selectedDoctorId,
      appointmentId,
      vitals,
      chiefComplaint,
      hpi,
      examination,
      clinicalNotes,
      diagnoses,
      treatments,
      services,
      additionalInstructions,
      followUpId,
      bmi,
      router,
    ]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      saveEncounter("view");
    },
    [saveEncounter]
  );

  const primaryDiagnosis = diagnoses.find((d) => d.isPrimary);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/emr"
            className="p-2 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Encounter</h1>
            <p className="text-gray-500 text-sm mt-1">
              {appointmentId
                ? "Creating encounter from appointment"
                : followUpId
                  ? "Creating encounter from follow-up"
                  : "Record a new clinical encounter"}
            </p>
          </div>
        </div>

        {followUpRef && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-5">
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
          {/* Patient & Doctor Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Patient & Doctor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                {appointmentId && loadingAppt ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
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
                )}
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
            </div>
          </div>

          {/* Vital Signs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} />
              Vital Signs
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  BP Systolic (mmHg)
                </label>
                <div className="relative">
                  <Heart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="120"
                    value={vitals.systolic}
                    onChange={(e) => updateVital("systolic", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  BP Diastolic (mmHg)
                </label>
                <div className="relative">
                  <Heart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="80"
                    value={vitals.diastolic}
                    onChange={(e) => updateVital("diastolic", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pulse (bpm)
                </label>
                <div className="relative">
                  <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="72"
                    value={vitals.pulse}
                    onChange={(e) => updateVital("pulse", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Temperature (°F)
                </label>
                <div className="relative">
                  <Thermometer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={vitals.temperature}
                    onChange={(e) => updateVital("temperature", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Resp. Rate (/min)
                </label>
                <div className="relative">
                  <Wind size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="16"
                    value={vitals.respiratoryRate}
                    onChange={(e) => updateVital("respiratoryRate", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={vitals.spo2}
                  onChange={(e) => updateVital("spo2", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Weight (kg)
                </label>
                <div className="relative">
                  <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="65"
                    value={vitals.weight}
                    onChange={(e) => updateVital("weight", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Height (cm)
                </label>
                <div className="relative">
                  <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="170"
                    value={vitals.height}
                    onChange={(e) => updateVital("height", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            {bmi && (
              <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                BMI: <span className="font-semibold">{bmi} kg/m²</span>
              </div>
            )}
          </div>

          {/* Chief Complaint */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope size={20} />
              Clinical Assessment
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Complaint *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Headache for 3 days"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  History of Present Illness
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the history of present illness..."
                  value={hpi}
                  onChange={(e) => setHpi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Examination Findings
                </label>
                <textarea
                  rows={4}
                  placeholder="Physical examination findings..."
                  value={examination}
                  onChange={(e) => setExamination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional clinical notes..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Diagnoses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Diagnoses</h2>
              <button
                type="button"
                onClick={addDiagnosis}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={16} />
                Add Diagnosis
              </button>
            </div>
            <div className="space-y-3">
              {diagnoses.map((diag, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                >
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={diag.isPrimary}
                      onChange={(e) => updateDiagnosis(idx, "isPrimary", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Primary
                  </label>
                  <input
                    type="text"
                    placeholder="ICD Code (e.g., J06.9)"
                    value={diag.code}
                    onChange={(e) => updateDiagnosis(idx, "code", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Diagnosis description"
                    value={diag.description}
                    onChange={(e) => updateDiagnosis(idx, "description", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {diagnoses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDiagnosis(idx)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Treatments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Treatment Plan</h2>
              <button
                type="button"
                onClick={addTreatment}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={16} />
                Add Treatment
              </button>
            </div>
            <div className="space-y-3">
              {treatments.map((treat, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                >
                  <input
                    type="text"
                    placeholder="Treatment description"
                    value={treat.description}
                    onChange={(e) => updateTreatment(idx, "description", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={treat.notes}
                    onChange={(e) => updateTreatment(idx, "notes", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {treatments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTreatment(idx)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Services / Tests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Services / Tests
              </h2>
              <button
                type="button"
                onClick={addService}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={16} />
                Add Service
              </button>
            </div>
            <div className="space-y-3">
              {services.map((svc, idx) => {
                const cat = catalog.find((c) => c.id === svc.serviceId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <select
                      value={svc.serviceId}
                      onChange={(e) => updateService(idx, "serviceId", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select service</option>
                      {catalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {formatCurrency(c.price)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={svc.quantity}
                      onChange={(e) =>
                        updateService(idx, "quantity", Number(e.target.value) || 1)
                      }
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={svc.notes}
                      onChange={(e) => updateService(idx, "notes", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        {cat ? formatCurrency(cat.price * (svc.quantity || 1)) : "-"}
                      </span>
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(idx)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {catalog.length === 0 && (
                <p className="text-sm text-gray-500">
                  No services available yet. Add services from the Services catalog.
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Instructions
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Diet, activity, or other instructions..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/emr"
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => saveEncounter("complete")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 border border-green-600 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition disabled:opacity-50"
            >
              <CheckCircle size={16} />
              Save & Complete
            </button>
            <button
              type="button"
              onClick={() => saveEncounter("bill")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 border border-blue-600 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
            >
              <Receipt size={16} />
              Save & Bill
            </button>
            <button
              type="button"
              onClick={() => saveEncounter("prescribe")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 border border-indigo-600 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition disabled:opacity-50"
            >
              <Pill size={16} />
              Save & Prescribe
            </button>
            <button
              type="button"
              onClick={() => saveEncounter("followup")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 border border-teal-600 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50"
            >
              <CalendarClock size={16} />
              Record Follow-up
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? "Saving..." : "Save Encounter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
