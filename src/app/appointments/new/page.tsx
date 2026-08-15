"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Doctor, Patient } from "@/types"

export default function NewAppointmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickPatient, setQuickPatient] = useState({
    name: "",
    phone: "",
    email: "",
  })

  const [form, setForm] = useState({
    doctorId: "",
    appointmentDate: new Date().toISOString().split("T")[0],
    appointmentTime: "09:00",
    duration: "30",
    consultationFee: "",
    doctorSharePercent: "",
    notes: "",
  })

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors?limit=100")
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.doctors || [])
      }
    } catch {
      console.error("Failed to fetch doctors")
    }
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatientResults([])
      return
    }
    try {
      setSearchingPatients(true)
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setPatientResults(data.patients || [])
      }
    } catch {
      console.error("Failed to search patients")
    } finally {
      setSearchingPatients(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch, searchPatients])

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const doctorId = e.target.value
    const doctor = doctors.find((d) => d.id === doctorId)
    setSelectedDoctor(doctor || null)
    setForm((prev) => ({
      ...prev,
      doctorId,
      consultationFee: doctor?.consultationFee?.toString() || "",
      doctorSharePercent: doctor?.revenueSharePercent?.toString() || "",
    }))
    if (errors.doctorId) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.doctorId
        return next
      })
    }
  }

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientSearch(patient.name)
    setShowPatientDropdown(false)
    setPatientResults([])
    if (errors.patientId) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.patientId
        return next
      })
    }
  }

  const clearPatient = () => {
    setSelectedPatient(null)
    setPatientSearch("")
    setPatientResults([])
  }

  const handleQuickCreate = async () => {
    if (!quickPatient.name.trim()) {
      toast("Patient name is required", "error")
      return
    }
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickPatient.name.trim(),
          phone: quickPatient.phone || null,
          email: quickPatient.email || null,
        }),
      })
      if (res.ok) {
        const patient = await res.json()
        selectPatient(patient)
        setShowQuickCreate(false)
        setQuickPatient({ name: "", phone: "", email: "" })
        toast("Patient created successfully", "success")
      } else {
        const data = await res.json()
        toast(data.error || "Failed to create patient", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedPatient) newErrors.patientId = "Patient is required"
    if (!form.doctorId) newErrors.doctorId = "Doctor is required"
    if (!form.appointmentDate) newErrors.appointmentDate = "Date is required"
    if (!form.appointmentTime) newErrors.appointmentTime = "Time is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const appointmentDateTime = `${form.appointmentDate}T${form.appointmentTime}:00`
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient!.id,
          doctorId: form.doctorId,
          appointmentDate: form.appointmentDate,
          appointmentTime: appointmentDateTime,
          duration: Number(form.duration) || 30,
          consultationFee: Number(form.consultationFee) || undefined,
          doctorSharePercent: Number(form.doctorSharePercent) || undefined,
          notes: form.notes || null,
        }),
      })

      if (res.ok) {
        const apt = await res.json()
        toast("Appointment created successfully", "success")
        router.push(`/appointments/${apt.id}`)
      } else {
        const data = await res.json()
        if (data.error && typeof data.error === "object") {
          setErrors(data.error)
        } else {
          toast(data.error || "Failed to create appointment", "error")
        }
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }

  const doctorOptions = doctors.map((d) => ({
    value: d.id,
    label: `${d.name}${d.specialization ? ` (${d.specialization})` : ""}`,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Appointment</h1>
          <p className="text-muted-foreground">Schedule a new appointment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                <div>
                  <p className="font-medium">{selectedPatient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.patientId}
                    {selectedPatient.phone ? ` · ${selectedPatient.phone}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearPatient}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search patient by name, phone, or ID..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setShowPatientDropdown(true)
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="pl-9"
                    error={errors.patientId}
                  />
                </div>
                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-md border bg-background shadow-md">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.patientId}
                            {p.phone ? ` · ${p.phone}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showPatientDropdown && patientSearch.length >= 2 && patientResults.length === 0 && !searchingPatients && (
                  <div className="rounded-md border bg-background p-4 text-center text-sm text-muted-foreground">
                    No patients found.
                    <button
                      type="button"
                      onClick={() => setShowQuickCreate(true)}
                      className="ml-1 text-primary underline hover:text-primary/80"
                    >
                      Create new patient
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Quick create new patient
                </button>
              </div>
            )}

            {showQuickCreate && (
              <Card className="border-dashed">
                <CardContent className="space-y-3 pt-4">
                  <p className="text-sm font-medium">Quick Create Patient</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Input
                      placeholder="Patient name *"
                      value={quickPatient.name}
                      onChange={(e) =>
                        setQuickPatient((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Phone"
                      value={quickPatient.phone}
                      onChange={(e) =>
                        setQuickPatient((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={quickPatient.email}
                      onChange={(e) =>
                        setQuickPatient((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleQuickCreate}>
                      Create & Select
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowQuickCreate(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                name="doctorId"
                label="Doctor *"
                value={form.doctorId}
                onChange={handleDoctorChange}
                options={doctorOptions}
                placeholder="Select a doctor"
                error={errors.doctorId}
              />
              <Input
                name="appointmentDate"
                label="Date *"
                type="date"
                value={form.appointmentDate}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, appointmentDate: e.target.value }))
                  if (errors.appointmentDate) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.appointmentDate
                      return next
                    })
                  }
                }}
                error={errors.appointmentDate}
              />
              <Input
                name="appointmentTime"
                label="Time *"
                type="time"
                value={form.appointmentTime}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, appointmentTime: e.target.value }))
                  if (errors.appointmentTime) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.appointmentTime
                      return next
                    })
                  }
                }}
                error={errors.appointmentTime}
              />
              <Select
                name="duration"
                label="Duration"
                value={form.duration}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duration: e.target.value }))
                }
                options={[
                  { value: "15", label: "15 minutes" },
                  { value: "30", label: "30 minutes" },
                  { value: "45", label: "45 minutes" },
                  { value: "60", label: "60 minutes" },
                ]}
              />
              <Input
                name="consultationFee"
                label="Consultation Fee"
                type="number"
                min="0"
                step="0.01"
                value={form.consultationFee}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, consultationFee: e.target.value }))
                }
              />
              <Input
                name="doctorSharePercent"
                label="Doctor Share %"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.doctorSharePercent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    doctorSharePercent: e.target.value,
                  }))
                }
              />
            </div>
            <Textarea
              name="notes"
              label="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional notes for this appointment"
              rows={3}
            />
          </CardContent>
        </Card>

        {selectedDoctor && (
          <Card>
            <CardHeader>
              <CardTitle>Appointment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedPatient?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selectedDoctor.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {form.appointmentDate} at {form.appointmentTime}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consultation Fee</p>
                  <p className="font-medium">
                    {formatCurrency(Number(form.consultationFee) || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/appointments")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Appointment"}
          </Button>
        </div>
      </form>
    </div>
  )
}
