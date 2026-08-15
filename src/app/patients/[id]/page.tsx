"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  ArrowLeft,
  Edit,
  Printer,
  Calendar,
  FileText,
  DollarSign,
  Activity,
  Stethoscope,
  Pill,
  Receipt,
  Plus,
  Download,
  Phone,
  User,
  Cake,
  HeartPulse,
  AlertCircle,
  ClipboardList,
  FlaskConical,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton, SkeletonCard } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { FollowUpTab } from "@/components/follow-ups/follow-ups-tab"
import { formatDate, formatCurrency } from "@/lib/utils"
import type {
  Patient,
  Encounter,
  Appointment,
  Prescription,
  Invoice,
  VitalSign,
  Diagnosis,
  Treatment,
  PrescriptionItem,
  InvoiceItem,
  Payment,
} from "@/types"

interface RelatedCounts {
  encounters?: number
  appointments?: number
  prescriptions?: number
  invoices?: number
}

type PatientDetail = Patient & {
  medicalConditions?: string | null
  currentMedications?: string | null
  _count?: RelatedCounts
}

interface EncounterService {
  id: string
  quantity: number
  price: number
  notes?: string | null
  service?: { name: string } | null
}

interface EncounterRow extends Encounter {
  vitals?: VitalSign[]
  diagnoses?: Diagnosis[]
  treatments?: Treatment[]
  services?: EncounterService[]
  doctor?: { id: string; name: string; specialization?: string | null }
  status?: string | null
}

interface PrescriptionRow extends Prescription {
  doctor?: { id: string; name: string }
  items?: PrescriptionItem[]
}

interface InvoiceRow extends Invoice {
  patient?: {
    id: string
    name: string
    patientId: string
  } | null
  items?: InvoiceItem[]
  payments?: Payment[]
  encounter?: {
    id: string
    encounterDate: string
    chiefComplaint: string | null
    doctor?: { id: string; name: string } | null
  } | null
  appointment?: {
    id: string
    appointmentNumber: number
    appointmentDate: string
    doctor?: { id: string; name: string } | null
  } | null
}

type Tab = "overview" | "encounters" | "prescriptions" | "follow-ups" | "billing" | "medical-history"

function calculateAge(dob?: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

export default function PatientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [encounters, setEncounters] = useState<EncounterRow[]>([])
  const [appointments, setAppointments] = useState<
    (Appointment & { doctor?: { name: string } })[]
  >([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`)
        if (res.ok) {
          setPatient(await res.json())
        } else {
          router.push("/patients")
        }
      } catch {
        router.push("/patients")
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [id, router])

  useEffect(() => {
    async function fetchRelated() {
      try {
        const [encRes, aptRes, rxRes, invRes] = await Promise.all([
          fetch(`/api/encounters?patientId=${id}&limit=100`),
          fetch(`/api/appointments?patientId=${id}&limit=100`),
          fetch(`/api/prescriptions?patientId=${id}&limit=100`),
          fetch(`/api/invoices?patientId=${id}&limit=100`),
        ])
        if (encRes.ok) {
          const data = await encRes.json()
          setEncounters(data.encounters || [])
        }
        if (aptRes.ok) {
          const data = await aptRes.json()
          setAppointments(data.appointments || [])
        }
        if (rxRes.ok) {
          const data = await rxRes.json()
          setPrescriptions(data.prescriptions || [])
        }
        if (invRes.ok) {
          const data = await invRes.json()
          setInvoices(data.invoices || [])
        }
      } catch {
        // ignore related-list fetch errors
      }
    }
    fetchRelated()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!patient) return null

  const age = calculateAge(patient.dateOfBirth as unknown as string | null)
  const outstandingBalance = invoices.reduce(
    (sum, inv) => sum + (inv.balance || 0),
    0
  )
  const lastVisit = encounters[0]?.encounterDate || appointments[0]?.appointmentDate
  const allDiagnoses = encounters.flatMap((e) => e.diagnoses || [])
  const allServices = encounters.flatMap((e) => e.services || [])
  const allPayments = invoices.flatMap((inv) => inv.payments || [])

  const openLatestReceipt = () => {
    const latest = [...invoices].sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    )[0]
    if (latest) {
      router.push(`/billing/invoices/${latest.id}?print=1`)
    } else {
      window.print()
    }
  }

  const downloadSummary = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Patient Summary", 14, 20)
    doc.setFontSize(11)
    doc.text(`Name: ${patient.name}`, 14, 30)
    doc.text(`Patient ID: ${patient.patientId}`, 14, 36)
    doc.text(`Phone: ${patient.phone || "-"}`, 14, 42)
    doc.text(`Gender: ${patient.gender || "-"}`, 14, 48)
    doc.text(
      `DOB: ${patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "-"}`,
      14,
      54
    )
    doc.text(`Address: ${patient.address || "-"}`, 14, 60)
    doc.text(`Email: ${patient.email || "-"}`, 14, 66)
    doc.text(`Blood Group: ${patient.bloodGroup || "-"}`, 14, 72)
    doc.text(`Registered: ${formatDate(patient.createdAt)}`, 14, 78)
    doc.text(`Allergies: ${patient.allergies || "None"}`, 14, 84)
    doc.text(
      `Medical Conditions: ${patient.medicalConditions || "None"}`,
      14,
      90
    )
    doc.text(
      `Current Medications: ${patient.currentMedications || "None"}`,
      14,
      96
    )
    doc.text(`Total Visits: ${encounters.length}`, 14, 104)
    doc.text(
      `Outstanding Balance: ${formatCurrency(outstandingBalance)}`,
      14,
      110
    )
    autoTable(doc, {
      startY: 118,
      head: [["Date", "Doctor", "Complaint", "Diagnoses"]],
      body: encounters.slice(0, 50).map((e) => [
        formatDate(e.encounterDate),
        e.doctor?.name || "-",
        e.chiefComplaint || "-",
        (e.diagnoses || []).map((d) => d.description).join(", ") || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
    })
    doc.save(`patient-${patient.patientId}-summary.pdf`)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
    { id: "encounters", label: "Encounters", icon: <Stethoscope className="h-4 w-4" /> },
    { id: "prescriptions", label: "Prescriptions", icon: <Pill className="h-4 w-4" /> },
    { id: "follow-ups", label: "Follow-ups", icon: <Calendar className="h-4 w-4" /> },
    { id: "billing", label: "Billing", icon: <DollarSign className="h-4 w-4" /> },
    { id: "medical-history", label: "Medical History", icon: <ClipboardList className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Print summary"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Summary
          </Button>
          <Button variant="outline" size="sm" onClick={downloadSummary}>
            <Download className="mr-2 h-4 w-4" />
            Download Summary
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/patients/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Patient
          </Button>
        </div>
      </div>

      {/* Patient header card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg">
        <div className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{patient.name}</h1>
                <p className="font-mono text-sm text-teal-100">
                  {patient.patientId}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {age !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                      <Cake className="h-3.5 w-3.5" /> {age} yrs
                    </span>
                  )}
                  {patient.gender && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                      <User className="h-3.5 w-3.5" /> {patient.gender}
                    </span>
                  )}
                  {patient.phone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                      <Phone className="h-3.5 w-3.5" /> {patient.phone}
                    </span>
                  )}
                  {lastVisit && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
                      <Calendar className="h-3.5 w-3.5" /> Last visit:{" "}
                      {formatDate(lastVisit)}
                    </span>
                  )}
                  {outstandingBalance > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-0.5 font-semibold">
                      <DollarSign className="h-3.5 w-3.5" /> Outstanding:{" "}
                      {formatCurrency(outstandingBalance)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => router.push(`/emr/new?patientId=${id}`)}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                New Encounter
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/prescriptions/new?patientId=${id}`)}
              >
                <Pill className="mr-2 h-4 w-4" />
                Prescribe
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/billing/invoices/new?patientId=${id}`)}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Create Bill
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={openLatestReceipt}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          title="Total Visits"
          value={encounters.length}
          icon={<Activity className="h-5 w-5 text-teal-500" />}
        />
        <StatCard
          title="Prescriptions"
          value={prescriptions.length}
          icon={<Pill className="h-5 w-5 text-indigo-500" />}
        />
        <StatCard
          title="Invoices"
          value={invoices.length}
          icon={<FileText className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(outstandingBalance)}
          icon={<DollarSign className="h-5 w-5 text-red-500" />}
        />
        <StatCard
          title="Appointments"
          value={appointments.length}
          icon={<Calendar className="h-5 w-5 text-green-500" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Patient ID" value={patient.patientId} />
                <InfoItem label="Phone" value={patient.phone || "-"} />
                <InfoItem label="Email" value={patient.email || "-"} />
                <InfoItem label="Gender" value={patient.gender || "-"} />
                <InfoItem
                  label="Date of Birth"
                  value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "-"}
                />
                <InfoItem
                  label="Age"
                  value={age !== null ? `${age} years` : "-"}
                />
                <InfoItem label="Registered" value={formatDate(patient.createdAt)} />
                <InfoItem label="Blood Group" value={patient.bloodGroup || "-"} />
                <InfoItem label="National ID" value={patient.nationalId || "-"} />
                <InfoItem label="Emergency Contact" value={patient.emergencyContact || "-"} />
                <InfoItem label="Address" value={patient.address || "-"} className="col-span-2" />
                {patient.allergies && (
                  <InfoItem label="Allergies" value={patient.allergies} className="col-span-3" />
                )}
                {patient.medicalConditions && (
                  <InfoItem label="Medical Conditions" value={patient.medicalConditions} className="col-span-3" />
                )}
                {patient.currentMedications && (
                  <InfoItem label="Current Medications" value={patient.currentMedications} className="col-span-3" />
                )}
                {patient.notes && (
                  <InfoItem label="Notes" value={patient.notes} className="col-span-3" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("encounters")}
              >
                View History
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {encounters.length === 0 && appointments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No visits yet. Start by creating a new encounter.
                </div>
              ) : (
                <div className="space-y-3">
                  {encounters.slice(0, 4).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => router.push(`/emr/${e.id}`)}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-teal-50 p-2">
                          <Stethoscope className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {e.chiefComplaint || "Encounter"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(e.encounterDate)} • Dr. {e.doctor?.name}
                          </p>
                        </div>
                      </div>
                      {e.status && <StatusBadge status={e.status} />}
                    </button>
                  ))}
                  {appointments.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-50 p-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Appointment #{a.appointmentNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(a.appointmentDate)} • {a.doctor?.name}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "encounters" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={() => router.push(`/emr/new?patientId=${id}`)}>
              <Stethoscope className="mr-2 h-4 w-4" />
              New Encounter
            </Button>
          </div>
          {encounters.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No encounters yet.
              </CardContent>
            </Card>
          ) : (
            encounters.map((encounter) => (
              <Card key={encounter.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {encounter.chiefComplaint || "Encounter"}
                      </CardTitle>
                      <p className="font-mono text-xs text-muted-foreground">
                        {encounter.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(encounter.encounterDate)}
                      </span>
                      {encounter.status && <StatusBadge status={encounter.status} />}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/emr/${encounter.id}`)}
                      >
                        Open
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Doctor: {encounter.doctor?.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {encounter.vitals?.[0] && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {encounter.vitals[0].bloodPressureSystolic && (
                        <span className="rounded bg-muted px-2 py-1">
                          BP: {encounter.vitals[0].bloodPressureSystolic}/
                          {encounter.vitals[0].bloodPressureDiastolic}
                        </span>
                      )}
                      {encounter.vitals[0].pulse != null && (
                        <span className="rounded bg-muted px-2 py-1">
                          Pulse: {encounter.vitals[0].pulse}
                        </span>
                      )}
                      {encounter.vitals[0].temperature != null && (
                        <span className="rounded bg-muted px-2 py-1">
                          Temp: {encounter.vitals[0].temperature}
                        </span>
                      )}
                      {encounter.vitals[0].weight != null && (
                        <span className="rounded bg-muted px-2 py-1">
                          Weight: {encounter.vitals[0].weight}kg
                        </span>
                      )}
                      {encounter.vitals[0].spo2 != null && (
                        <span className="rounded bg-muted px-2 py-1">
                          SpO2: {encounter.vitals[0].spo2}%
                        </span>
                      )}
                    </div>
                  )}
                  {encounter.chiefComplaint && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Symptoms:</span>{" "}
                      {encounter.chiefComplaint}
                    </p>
                  )}
                  {encounter.diagnoses?.length ? (
                    <div>
                      <p className="text-sm font-medium">Diagnoses:</p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {encounter.diagnoses.map((d) => (
                          <li key={d.id}>
                            {d.code && `(${d.code}) `}{d.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {encounter.clinicalNotes && (
                    <div>
                      <p className="text-sm font-medium">Clinical Notes:</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {encounter.clinicalNotes}
                      </p>
                    </div>
                  )}
                  {encounter.treatments?.length ? (
                    <div>
                      <p className="text-sm font-medium">Treatments:</p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {encounter.treatments.map((t) => (
                          <li key={t.id}>
                            {t.description}
                            {t.notes && ` (${t.notes})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {encounter.services && encounter.services.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Services / Tests:</p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {encounter.services.map((s) => (
                          <li key={s.id}>
                            {s.service?.name}
                            {s.quantity > 1 && ` x${s.quantity}`}
                            {" - "}
                            {formatCurrency(s.price * s.quantity)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {encounter.followUpDate && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Follow-up:</span>{" "}
                      {formatDate(encounter.followUpDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={() => router.push(`/prescriptions/new?patientId=${id}`)}>
              <Pill className="mr-2 h-4 w-4" />
              New Prescription
            </Button>
          </div>
          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No prescriptions yet.
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((rx) => (
              <Card key={rx.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="font-mono text-base">
                        {rx.prescriptionNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Dr. {rx.doctor?.name} • {formatDate(rx.prescriptionDate)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/prescriptions/${rx.id}`)}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      View & Print
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rx.diagnosis && (
                    <p className="text-sm">
                      <span className="font-medium">Diagnosis:</span> {rx.diagnosis}
                    </p>
                  )}
                  {rx.items?.length ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Medicine</th>
                            <th className="px-3 py-2 text-left font-medium">Dosage</th>
                            <th className="px-3 py-2 text-left font-medium">Frequency</th>
                            <th className="px-3 py-2 text-left font-medium">Duration</th>
                            <th className="px-3 py-2 text-left font-medium">Qty</th>
                            <th className="px-3 py-2 text-left font-medium">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {rx.items.map((item, i) => (
                            <tr key={item.id || i}>
                              <td className="px-3 py-2 font-medium">
                                {item.medicineName}
                                {item.strength && (
                                  <span className="text-muted-foreground"> {item.strength}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">{item.dosage}</td>
                              <td className="px-3 py-2">{item.frequency}</td>
                              <td className="px-3 py-2">{item.duration || "-"}</td>
                              <td className="px-3 py-2">{item.quantity ?? "-"}</td>
                              <td className="px-3 py-2">{item.instructions || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {rx.notes && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Notes:</span> {rx.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "follow-ups" && <FollowUpTab patientId={id} />}

      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Billing summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="Total Billed"
              value={formatCurrency(invoices.reduce((s, i) => s + i.totalAmount, 0))}
              icon={<FileText className="h-5 w-5 text-purple-500" />}
            />
            <StatCard
              title="Total Paid"
              value={formatCurrency(invoices.reduce((s, i) => s + i.paidAmount, 0))}
              icon={<CreditCard className="h-5 w-5 text-green-500" />}
            />
            <StatCard
              title="Outstanding Balance"
              value={formatCurrency(outstandingBalance)}
              icon={<DollarSign className="h-5 w-5 text-red-500" />}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button size="sm" onClick={() => router.push(`/billing/invoices/new?patientId=${id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Bill
            </Button>
          </div>

          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No invoices yet.
              </CardContent>
            </Card>
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {inv.patient?.name || "Unknown Patient"}
                      </p>
                      <p className="font-mono font-medium text-teal-700">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(inv.invoiceDate)}
                        {inv.encounter?.doctor?.name &&
                          ` • Dr. ${inv.encounter.doctor.name}`}
                        {inv.encounter?.id && (
                          <span className="font-mono"> • Enc: {inv.encounter.id.slice(0, 8)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(inv.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid: {formatCurrency(inv.paidAmount)} • Balance:{" "}
                          {formatCurrency(inv.balance)}
                        </p>
                        {inv.paymentMethod && (
                          <p className="text-xs text-muted-foreground">
                            {inv.paymentMethod.replace("_", " ")}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={inv.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                      >
                        View
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {inv.items?.length ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Item</th>
                            <th className="px-3 py-2 text-left font-medium">Qty</th>
                            <th className="px-3 py-2 text-right font-medium">Price</th>
                            <th className="px-3 py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {inv.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">
                                <p className="font-medium">{item.serviceName}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                )}
                              </td>
                              <td className="px-3 py-2">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <div className="flex justify-end gap-4 text-xs text-muted-foreground">
                    <span>Subtotal: {formatCurrency(inv.subtotal)}</span>
                    {inv.discount > 0 && <span>Discount: {formatCurrency(inv.discount)}</span>}
                    <span>Tax ({inv.taxPercent}%): {formatCurrency(inv.taxAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Payment history */}
          {allPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Payment#</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-left font-medium">Method</th>
                        <th className="px-3 py-2 text-left font-medium">Invoice</th>
                        <th className="px-3 py-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono text-blue-600">{p.paymentNumber}</td>
                          <td className="px-3 py-2">{formatDate(p.paymentDate)}</td>
                          <td className="px-3 py-2 text-right font-medium text-green-600">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-3 py-2">{p.paymentMethod.replace("_", " ")}</td>
                          <td className="px-3 py-2">
                            {p.invoiceId ? (
                              <button
                                onClick={() => router.push(`/billing/invoices/${p.invoiceId}`)}
                                className="font-mono text-teal-700 hover:underline"
                              >
                                {invoices.find((i) => i.id === p.invoiceId)?.invoiceNumber || p.invoiceId.slice(0, 8)}
                              </button>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "medical-history" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {patient.allergies || "None recorded"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="h-4 w-4 text-teal-500" />
                  Medical Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {patient.medicalConditions || "None recorded"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-4 w-4 text-indigo-500" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {patient.currentMedications || "None recorded"}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                All Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allDiagnoses.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No diagnoses recorded.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allDiagnoses.map((d) => (
                    <span
                      key={d.id}
                      className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800"
                    >
                      {d.code && <span className="font-mono">({d.code}) </span>}
                      {d.description}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Procedures / Tests Performed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allServices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No procedures or tests recorded.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {allServices.map((s) => (
                    <li key={s.id} className="flex justify-between text-sm">
                      <span>
                        {s.service?.name}
                        {s.quantity > 1 && ` x${s.quantity}`}
                      </span>
                      <span className="font-medium">{formatCurrency(s.price * s.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Previous Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No prescriptions recorded.
                </div>
              ) : (
                <ul className="space-y-2">
                  {prescriptions.map((rx) => (
                    <li key={rx.id} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="font-mono">{rx.prescriptionNumber}</span>
                        {" - "}
                        {(rx.items || []).map((i) => i.medicineName).join(", ")}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(rx.prescriptionDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="rounded-lg bg-muted p-2">{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}