"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  Phone,
  Cake,
  Stethoscope,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Patient {
  id: string
  name: string
  patientId: string
  phone?: string | null
  dateOfBirth?: string | null
}

interface Doctor {
  id: string
  name: string
  specialization?: string | null
}

interface Encounter {
  id: string
  encounterDate: string
  chiefComplaint: string | null
  doctor?: { name: string } | null
}

interface Prescription {
  id: string
  prescriptionNumber: string
  prescriptionDate: string
}

export default function NewFollowUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId")
  const encounterId = searchParams.get("encounterId")
  const doctorId = searchParams.get("doctorId")

  const [patient, setPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [showPicker, setShowPicker] = useState(!patientId)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    doctorId: doctorId || "",
    encounterId: encounterId || "",
    relatedPrescriptionId: "",
    reason: "",
    objective: "",
    diagnosis: "",
    clinicalNotes: "",
    doctorInstructions: "",
  })

  const activePatientId = patient?.id

  useEffect(() => {
    fetch("/api/patients?limit=200")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPatients(data.patients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (patientId) {
      fetch(`/api/patients/${patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((p) => {
          if (p) {
            setPatient(p)
            setShowPicker(false)
          }
        })
        .catch(() => {})
    }
  }, [patientId])

  useEffect(() => {
    fetch("/api/doctors")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setDoctors(data.doctors || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activePatientId) {
      fetch(`/api/encounters?patientId=${activePatientId}&limit=20`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data && setEncounters(data.encounters || []))
        .catch(() => {})
      fetch(`/api/prescriptions?patientId=${activePatientId}&limit=20`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data && setPrescriptions(data.prescriptions || []))
        .catch(() => {})
    }
  }, [activePatientId])

  const matchedPatients = patients
    .filter((p) => {
      const q = patientSearch.toLowerCase()
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q)
      )
    })
    .slice(0, 10)

  const selectPatient = (p: Patient) => {
    setPatient(p)
    setShowPicker(false)
    setPatientSearch("")
    setEncounters([])
    setPrescriptions([])
    setForm((f) => ({ ...f, encounterId: "", relatedPrescriptionId: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient?.id) {
      alert("Please select a patient")
      return
    }
    if (!form.doctorId) {
      alert("Please select a doctor")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        patientId: patient?.id,
        doctorId: form.doctorId,
        encounterId: form.encounterId || undefined,
        relatedPrescriptionId: form.relatedPrescriptionId || undefined,
        reason: form.reason || undefined,
        objective: form.objective || undefined,
        diagnosis: form.diagnosis || undefined,
        clinicalNotes: form.clinicalNotes || undefined,
        doctorInstructions: form.doctorInstructions || undefined,
      }
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/follow-ups/${data.id}`)
      } else {
        const err = await res.json().catch(() => ({}))
        let msg = "Failed to record follow-up"
        if (typeof err?.error === "string") msg = err.error
        else if (err?.error && typeof err.error === "object") {
          msg = Object.entries(err.error)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("\n")
        }
        alert(msg)
      }
    } catch {
      alert("Network error. Please try again.")
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href={patientId ? `/patients/${patientId}` : "/follow-ups"}
            className="p-2 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Record Follow-up</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Record that this patient came back for a revisit
            </p>
          </div>
        </div>

        {/* Patient - selectable */}
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-teal-900">Patient</p>
            {!showPicker && patient && (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="rounded-lg border border-teal-300 bg-white px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
              >
                Change patient
              </button>
            )}
          </div>

          {showPicker ? (
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search patient by name or ID..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              {patientSearch && (
                <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {matchedPatients.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">
                      No patients found
                    </p>
                  ) : (
                    matchedPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                      >
                        <span>{p.name}</span>
                        <span className="text-xs text-gray-400">{p.patientId}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">
                {patient?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-teal-600" />
                  <p className="font-semibold text-gray-900">
                    {patient?.name || "Select patient"}
                  </p>
                  {patient?.patientId && (
                    <span className="font-mono text-xs text-teal-700">
                      {patient.patientId}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {patient.phone}
                    </span>
                  )}
                  {patient?.dateOfBirth && (
                    <span className="flex items-center gap-1">
                      <Cake size={12} />{" "}
                      {new Date(patient.dateOfBirth).toLocaleDateString("en-NP", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visit Information */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Stethoscope size={20} className="text-teal-600" />
              Visit Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Doctor *
                </label>
                <select
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name}
                      {d.specialization ? ` (${d.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Related Encounter
                </label>
                <select
                  value={form.encounterId}
                  onChange={(e) => setForm({ ...form, encounterId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">No encounter</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {new Date(enc.encounterDate).toLocaleDateString("en-NP")} -{" "}
                      {enc.chiefComplaint || "No complaint"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Related Prescription
                </label>
                <select
                  value={form.relatedPrescriptionId}
                  onChange={(e) =>
                    setForm({ ...form, relatedPrescriptionId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">No prescription</option>
                  {prescriptions.map((rx) => (
                    <option key={rx.id} value={rx.id}>
                      {rx.prescriptionNumber} -{" "}
                      {new Date(rx.prescriptionDate).toLocaleDateString("en-NP")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason for Revisit
                </label>
                <input
                  type="text"
                  placeholder="e.g., Review lab results, symptoms returned"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Visit Objective
                </label>
                <input
                  type="text"
                  placeholder="e.g., Confirm recovery, evaluate treatment response"
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Clinical Notes
                </label>
                <textarea
                  rows={3}
                  value={form.clinicalNotes}
                  onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Doctor&apos;s Instructions
                </label>
                <textarea
                  rows={3}
                  value={form.doctorInstructions}
                  onChange={(e) =>
                    setForm({ ...form, doctorInstructions: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={patientId ? `/patients/${patientId}` : "/follow-ups"}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <Button type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? "Saving..." : "Record Follow-up"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}