"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  Stethoscope,
  Pill,
  Receipt,
  Pencil,
  CheckCircle2,
  FileText,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatDateTime } from "@/lib/utils"

interface FollowUpDetail {
  id: string
  followUpNumber: string
  patientId: string
  doctorId: string
  encounterId: string | null
  relatedPrescriptionId: string | null
  reason: string | null
  objective: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  doctorInstructions: string | null
  outcome: string | null
  progress: string | null
  currentSymptoms: string | null
  examinationFindings: string | null
  diagnosisUpdate: string | null
  treatmentResponse: string | null
  medicationChanges: string | null
  doctorNotes: string | null
  nextAction: string | null
  nextActionDetails: string | null
  completedAt: string | null
  createdAt: string
  patient: {
    id: string
    name: string
    phone: string | null
    patientId: string
    dateOfBirth: string | null
    gender: string | null
  }
  doctor: { id: string; name: string; specialization: string | null }
  encounter?: {
    id: string
    encounterDate: string
    chiefComplaint: string | null
    doctor?: { name: string } | null
    diagnoses?: { id: string; description: string; isPrimary: number }[]
    treatments?: { id: string; description: string }[]
  } | null
  relatedPrescription?: {
    id: string
    prescriptionNumber: string
    prescriptionDate: string
    items?: { id: string; medicineName: string; dosage: string; frequency: string }[]
  } | null
  encounters?: {
    id: string
    encounterDate: string
    chiefComplaint: string | null
    doctor?: { name: string } | null
    diagnoses?: { id: string; description: string }[]
  }[]
  prescriptions?: {
    id: string
    prescriptionNumber: string
    prescriptionDate: string
    items?: { id: string; medicineName: string; dosage: string; frequency: string }[]
  }[]
  invoices?: {
    id: string
    invoiceNumber: string
    invoiceDate: string
    totalAmount: number
    status: string
  }[]
}

const nextActionOptions = [
  { value: "NO_FURTHER_FOLLOW_UP", label: "No further follow-up required" },
  { value: "CONTINUE_CURRENT_MEDICATION", label: "Continue current medication" },
  { value: "CHANGE_MEDICATION", label: "Change medication" },
  { value: "ORDER_LAB_TEST", label: "Order laboratory test" },
  { value: "ORDER_IMAGING", label: "Order imaging" },
  { value: "REFER_DOCTOR", label: "Refer to another doctor" },
  { value: "OTHER", label: "Other" },
]

const outcomeOptions = [
  "Improved",
  "Stable",
  "Not improved",
  "Worsened",
  "Treatment completed",
  "Referred",
]

interface HistoryEncounter {
  id: string
  encounterDate: string
  chiefComplaint: string | null
  doctor?: { name: string } | null
  diagnoses?: { description: string; isPrimary: number }[]
}

interface HistoryPrescription {
  id: string
  prescriptionNumber: string
  prescriptionDate: string
  doctor?: { name: string } | null
  items?: { medicineName: string; dosage: string; frequency: string }[]
}

export default function FollowUpDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  const [fu, setFu] = useState<FollowUpDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showComplete, setShowComplete] = useState(
    searchParams.get("complete") === "1"
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    reason: "",
    objective: "",
    diagnosis: "",
    clinicalNotes: "",
    doctorInstructions: "",
  })
  const [completeForm, setCompleteForm] = useState({
    outcome: "",
    progress: "",
    currentSymptoms: "",
    examinationFindings: "",
    diagnosisUpdate: "",
    treatmentResponse: "",
    medicationChanges: "",
    doctorNotes: "",
    nextAction: "",
    nextActionDetails: "",
  })
  const [historyEncounters, setHistoryEncounters] = useState<HistoryEncounter[]>([])
  const [historyPrescriptions, setHistoryPrescriptions] = useState<HistoryPrescription[]>([])

  const fetchFollowUp = useCallback(async () => {
    try {
      const res = await fetch(`/api/follow-ups/${id}`)
      if (res.ok) {
        const data = await res.json()
        setFu(data)
      } else {
        router.push("/follow-ups")
      }
    } catch {
      router.push("/follow-ups")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetch(`/api/follow-ups/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((data) => {
        if (data) setFu(data)
        else router.push("/follow-ups")
      })
      .catch(() => router.push("/follow-ups"))
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    if (!fu?.patient?.id) return
    fetch(`/api/encounters?patientId=${fu.patient.id}&limit=10`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setHistoryEncounters(data.encounters || []))
      .catch(() => {})
    fetch(`/api/prescriptions?patientId=${fu.patient.id}&limit=10`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setHistoryPrescriptions(data.prescriptions || []))
      .catch(() => {})
  }, [fu?.patient?.id])

  const openEdit = useCallback(() => {
    if (!fu) return
    setEditForm({
      reason: fu.reason || "",
      objective: fu.objective || "",
      diagnosis: fu.diagnosis || "",
      clinicalNotes: fu.clinicalNotes || "",
      doctorInstructions: fu.doctorInstructions || "",
    })
    setShowEdit(true)
  }, [fu])

  const timeline = useMemo(() => {
    if (!fu) return []
    const events: {
      date: string
      label: string
      href?: string
      icon: React.ReactNode
    }[] = [
      {
        date: fu.createdAt,
        label: `Follow-up ${fu.followUpNumber} recorded`,
        href: `/follow-ups/${fu.id}`,
        icon: <CalendarClock className="h-4 w-4" />,
      },
    ]
    for (const e of fu.encounters || []) {
      events.push({
        date: e.encounterDate,
        label: `Encounter created${e.chiefComplaint ? ` - ${e.chiefComplaint}` : ""}`,
        href: `/emr/${e.id}`,
        icon: <Stethoscope className="h-4 w-4" />,
      })
    }
    for (const rx of fu.prescriptions || []) {
      events.push({
        date: rx.prescriptionDate,
        label: `Prescription ${rx.prescriptionNumber} created`,
        href: `/prescriptions/${rx.id}`,
        icon: <Pill className="h-4 w-4" />,
      })
    }
    for (const inv of fu.invoices || []) {
      events.push({
        date: inv.invoiceDate,
        label: `Invoice ${inv.invoiceNumber} generated (${inv.status})`,
        href: `/billing/invoices/${inv.id}`,
        icon: <Receipt className="h-4 w-4" />,
      })
    }
    if (fu.completedAt) {
      events.push({
        date: fu.completedAt,
        label: "Follow-up completed",
        href: `/follow-ups/${fu.id}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    }
    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [fu])

  if (loading) {
    return <div className="space-y-4 p-6">Loading follow-up...</div>
  }

  if (!fu) return null

  const saveEditData = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy("EDIT")
    try {
      const res = await fetch(`/api/follow-ups/${fu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: editForm.reason || undefined,
          objective: editForm.objective || undefined,
          diagnosis: editForm.diagnosis || undefined,
          clinicalNotes: editForm.clinicalNotes || undefined,
          doctorInstructions: editForm.doctorInstructions || undefined,
        }),
      })
      if (res.ok) {
        setShowEdit(false)
        await fetchFollowUp()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Failed to update follow-up")
      }
    } catch {
      alert("Network error. Please try again.")
    }
    setBusy(null)
  }

  const completeFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completeForm.outcome) {
      alert("Please select a follow-up outcome")
      return
    }
    setBusy("COMPLETE")
    try {
      const res = await fetch(`/api/follow-ups/${fu.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: completeForm.outcome,
          progress: completeForm.progress || undefined,
          currentSymptoms: completeForm.currentSymptoms || undefined,
          examinationFindings: completeForm.examinationFindings || undefined,
          diagnosisUpdate: completeForm.diagnosisUpdate || undefined,
          treatmentResponse: completeForm.treatmentResponse || undefined,
          medicationChanges: completeForm.medicationChanges || undefined,
          doctorNotes: completeForm.doctorNotes || undefined,
          nextAction: completeForm.nextAction || undefined,
          nextActionDetails: completeForm.nextActionDetails || undefined,
        }),
      })
      if (res.ok) {
        setShowComplete(false)
        await fetchFollowUp()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Failed to complete follow-up")
      }
    } catch {
      alert("Network error. Please try again.")
    }
    setBusy(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/patients/${fu.patientId}`}
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Follow-up {fu.followUpNumber}
                </h1>
                <StatusBadge status={fu.completedAt ? "COMPLETED" : "OPEN"} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {fu.patient.name} · {fu.patient.patientId}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            {!fu.completedAt && (
              <Button size="sm" onClick={() => setShowComplete(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
              </Button>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              router.push(
                `/emr/new?patientId=${fu.patientId}&doctorId=${fu.doctorId}&followUpId=${fu.id}&encounterId=${fu.encounterId || ""}`
              )
            }
          >
            <Stethoscope className="mr-2 h-4 w-4" /> Start Encounter
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              router.push(
                `/prescriptions/new?patientId=${fu.patientId}&doctorId=${fu.doctorId}&followUpId=${fu.id}&encounterId=${fu.encounterId || ""}`
              )
            }
          >
            <Pill className="mr-2 h-4 w-4" /> Create Prescription
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              router.push(
                `/billing/invoices/new?patientId=${fu.patientId}&followUpId=${fu.id}&encounterId=${fu.encounterId || ""}`
              )
            }
          >
            <Receipt className="mr-2 h-4 w-4" /> Create Bill
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Visit Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Visit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Info label="Follow-up ID" value={fu.followUpNumber} />
                <Info label="Patient" value={fu.patient.name} />
                <Info label="Recorded" value={formatDateTime(fu.createdAt)} />
                <Info label="Doctor" value={`Dr. ${fu.doctor.name}`} />
                <Info
                  label="Doctor Specialization"
                  value={fu.doctor.specialization || "—"}
                />
                <Info
                  label="Status"
                  value={fu.completedAt ? "Completed" : "Open"}
                />
              </CardContent>
            </Card>

            {/* Clinical Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Clinical Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <SectionLabel>Related Encounter</SectionLabel>
                  {fu.encounter ? (
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{fu.encounter.id.slice(0, 8)}</span>
                        <Link
                          href={`/emr/${fu.encounter.id}`}
                          className="text-teal-600 hover:underline"
                        >
                          Open Encounter →
                        </Link>
                      </div>
                      <p className="mt-1 text-gray-600">
                        {formatDate(fu.encounter.encounterDate)}
                        {fu.encounter.chiefComplaint
                          ? ` · ${fu.encounter.chiefComplaint}`
                          : ""}
                      </p>
                      {(fu.encounter?.diagnoses || []).length > 0 && (
                        <p className="mt-1 text-gray-600">
                          <span className="font-medium">Diagnosis:</span>{" "}
                          {(fu.encounter?.diagnoses || [])
                            .map((d) => d.description)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No related encounter linked.</p>
                  )}
                </div>
                <Info
                  label="Diagnosis"
                  value={fu.diagnosis || "—"}
                  block
                />
                <Info label="Reason for Revisit" value={fu.reason || "—"} block />
                <Info label="Visit Objective" value={fu.objective || "—"} block />
                {fu.relatedPrescription && (
                  <div>
                    <SectionLabel>Previous Prescription</SectionLabel>
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">
                          {fu.relatedPrescription.prescriptionNumber}
                        </span>
                        <Link
                          href={`/prescriptions/${fu.relatedPrescription.id}`}
                          className="text-teal-600 hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                      <p className="mt-1 text-gray-600">
                        {(fu.relatedPrescription.items || [])
                          .map((i) => `${i.medicineName} ${i.dosage}`)
                          .join(", ") || "No items"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Clinical Notes" value={fu.clinicalNotes || "—"} block />
                <Info
                  label="Doctor's Instructions"
                  value={fu.doctorInstructions || "—"}
                  block
                />
                {fu.outcome && (
                  <>
                    <SectionLabel>Follow-up Outcome</SectionLabel>
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                      <p>
                        <span className="font-medium">Outcome:</span> {fu.outcome}
                      </p>
                      {fu.progress && <p className="mt-1">{fu.progress}</p>}
                      {fu.currentSymptoms && (
                        <p className="mt-1">
                          <span className="font-medium">Current symptoms:</span>{" "}
                          {fu.currentSymptoms}
                        </p>
                      )}
                      {fu.examinationFindings && (
                        <p className="mt-1">
                          <span className="font-medium">Examination:</span>{" "}
                          {fu.examinationFindings}
                        </p>
                      )}
                      {fu.diagnosisUpdate && (
                        <p className="mt-1">
                          <span className="font-medium">Diagnosis update:</span>{" "}
                          {fu.diagnosisUpdate}
                        </p>
                      )}
                      {fu.treatmentResponse && (
                        <p className="mt-1">
                          <span className="font-medium">Treatment response:</span>{" "}
                          {fu.treatmentResponse}
                        </p>
                      )}
                      {fu.medicationChanges && (
                        <p className="mt-1">
                          <span className="font-medium">Medication changes:</span>{" "}
                          {fu.medicationChanges}
                        </p>
                      )}
                      {fu.doctorNotes && (
                        <p className="mt-1">
                          <span className="font-medium">Doctor notes:</span>{" "}
                          {fu.doctorNotes}
                        </p>
                      )}
                      {fu.nextAction && (
                        <p className="mt-2 border-t pt-2">
                          <span className="font-medium">Next action:</span>{" "}
                          {nextActionOptions.find((o) => o.value === fu.nextAction)?.label ||
                            fu.nextAction.replace(/_/g, " ")}
                          {fu.nextActionDetails && ` — ${fu.nextActionDetails}`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Patient's Previous Records (read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Patient&apos;s Previous Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <SectionLabel>Recent Encounters</SectionLabel>
                  {historyEncounters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No past encounters found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Doctor</th>
                            <th className="px-3 py-2">Chief Complaint</th>
                            <th className="px-3 py-2">Diagnosis</th>
                            <th className="px-3 py-2 text-right">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyEncounters.map((e) => (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {formatDate(e.encounterDate)}
                              </td>
                              <td className="px-3 py-2">
                                {e.doctor?.name || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {e.chiefComplaint || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {(e.diagnoses || []).length > 0
                                  ? (e.diagnoses || [])
                                      .map((d) => d.description)
                                      .join(", ")
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                <Link
                                  href={`/emr/${e.id}`}
                                  className="text-teal-600 hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <SectionLabel>Recent Prescriptions</SectionLabel>
                  {historyPrescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No past prescriptions found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Number</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Doctor</th>
                            <th className="px-3 py-2">Medicines</th>
                            <th className="px-3 py-2 text-right">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyPrescriptions.map((rx) => (
                            <tr key={rx.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono">
                                {rx.prescriptionNumber}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {formatDate(rx.prescriptionDate)}
                              </td>
                              <td className="px-3 py-2">
                                {rx.doctor?.name || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {(rx.items || []).length > 0
                                  ? (rx.items || [])
                                      .map((i) => `${i.medicineName} ${i.dosage}`)
                                      .join(", ")
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                <Link
                                  href={`/prescriptions/${rx.id}`}
                                  className="text-teal-600 hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-4 border-l border-gray-200 pl-6">
                  {timeline.map((ev, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                        {ev.icon}
                      </span>
                      {ev.href ? (
                        <Link
                          href={ev.href}
                          className="block rounded-lg px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          <p className="font-medium text-gray-800">{ev.label}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(ev.date)}
                          </p>
                        </Link>
                      ) : (
                        <div className="px-2 py-1">
                          <p className="font-medium text-gray-800">{ev.label}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(ev.date)}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Follow-up" size="xl">
        <form onSubmit={saveEditData} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Objective</label>
              <input
                type="text"
                value={editForm.objective}
                onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Diagnosis</label>
              <input
                type="text"
                value={editForm.diagnosis}
                onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Clinical Notes</label>
            <textarea
              rows={2}
              value={editForm.clinicalNotes}
              onChange={(e) => setEditForm({ ...editForm, clinicalNotes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Doctor&apos;s Instructions</label>
            <textarea
              rows={2}
              value={editForm.doctorInstructions}
              onChange={(e) => setEditForm({ ...editForm, doctorInstructions: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy === "EDIT"}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={showComplete} onClose={() => setShowComplete(false)} title="Complete Follow-up" size="xl">
        <form onSubmit={completeFollowUp} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Follow-up Outcome *</label>
            <select
              required
              value={completeForm.outcome}
              onChange={(e) => setCompleteForm({ ...completeForm, outcome: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select outcome</option>
              {outcomeOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Patient Progress</label>
              <textarea
                rows={2}
                value={completeForm.progress}
                onChange={(e) => setCompleteForm({ ...completeForm, progress: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Current Symptoms</label>
              <textarea
                rows={2}
                value={completeForm.currentSymptoms}
                onChange={(e) => setCompleteForm({ ...completeForm, currentSymptoms: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Examination Findings</label>
              <textarea
                rows={2}
                value={completeForm.examinationFindings}
                onChange={(e) => setCompleteForm({ ...completeForm, examinationFindings: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Diagnosis Update</label>
              <textarea
                rows={2}
                value={completeForm.diagnosisUpdate}
                onChange={(e) => setCompleteForm({ ...completeForm, diagnosisUpdate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Treatment Response</label>
              <textarea
                rows={2}
                value={completeForm.treatmentResponse}
                onChange={(e) => setCompleteForm({ ...completeForm, treatmentResponse: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Medication Changes</label>
              <textarea
                rows={2}
                value={completeForm.medicationChanges}
                onChange={(e) => setCompleteForm({ ...completeForm, medicationChanges: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Doctor Notes</label>
            <textarea
              rows={2}
              value={completeForm.doctorNotes}
              onChange={(e) => setCompleteForm({ ...completeForm, doctorNotes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Next Action</label>
              <select
                value={completeForm.nextAction}
                onChange={(e) => setCompleteForm({ ...completeForm, nextAction: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select next action</option>
                {nextActionOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Next Action Details</label>
              <input
                type="text"
                value={completeForm.nextActionDetails}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, nextActionDetails: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowComplete(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy === "COMPLETE"}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Follow-up
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function Info({
  label,
  value,
  block,
}: {
  label: string
  value: string
  block?: boolean
}) {
  return (
    <div className={block ? "block" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}
