"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarPlus,
  CalendarDays,
  List,
  UserCheck,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { useToast } from "@/components/ui/toast"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { Appointment, Doctor } from "@/types"

interface AppointmentWithRelations extends Appointment {
  patient: { id: string; name: string; phone: string | null; patientId: string }
  doctor: { id: string; name: string; specialization: string | null }
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "IN_CONSULTATION", label: "In Consultation" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

export default function AppointmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [date, setDate] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [status, setStatus] = useState("")

  const doctorOptions = [
    { value: "", label: "All Doctors" },
    ...doctors.map((d) => ({ value: d.id, label: d.name })),
  ]

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

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      })
      if (date) params.set("date", date)
      if (doctorId) params.set("doctorId", doctorId)
      if (status) params.set("status", status)

      const res = await fetch(`/api/appointments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch {
      console.error("Failed to fetch appointments")
    } finally {
      setLoading(false)
    }
  }, [page, date, doctorId, status])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleAction = async (
    apt: AppointmentWithRelations,
    action: "check-in" | "complete" | "cancel"
  ) => {
    const confirmMessages = {
      "check-in": "Check in this patient?",
      complete: "Mark this appointment as completed?",
      cancel: "Cancel this appointment?",
    }

    if (!window.confirm(confirmMessages[action])) return

    try {
      const res = await fetch(`/api/appointments/${apt.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "cancel" ? JSON.stringify({ reason: "Cancelled by user" }) : undefined,
      })

      if (res.ok) {
        toast(`Appointment ${action.replace("-", " ")} successful`, "success")
        fetchAppointments()
      } else {
        const data = await res.json()
        toast(data.error || `Failed to ${action}`, "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const getActions = (apt: AppointmentWithRelations) => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; className?: string }[] = []

    actions.push({
      label: "View",
      icon: <Eye className="h-3.5 w-3.5" />,
      onClick: () => router.push(`/appointments/${apt.id}`),
    })

    if (apt.status === "PENDING" || apt.status === "CONFIRMED") {
      actions.push({
        label: "Check-In",
        icon: <UserCheck className="h-3.5 w-3.5" />,
        onClick: () => handleAction(apt, "check-in"),
        className: "text-blue-600 hover:text-blue-700",
      })
    }

    if (apt.status === "CHECKED_IN" || apt.status === "IN_CONSULTATION") {
      actions.push({
        label: "Complete",
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        onClick: () => handleAction(apt, "complete"),
        className: "text-green-600 hover:text-green-700",
      })
    }

    if (apt.status !== "COMPLETED" && apt.status !== "CANCELLED") {
      actions.push({
        label: "Cancel",
        icon: <XCircle className="h-3.5 w-3.5" />,
        onClick: () => handleAction(apt, "cancel"),
        className: "text-red-600 hover:text-red-700",
      })
    }

    return actions
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">{total} total appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/appointments/calendar")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button onClick={() => router.push("/appointments/new")}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setPage(1)
              }}
            />
            <Select
              label="Doctor"
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value)
                setPage(1)
              }}
              options={doctorOptions}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              options={statusOptions}
            />
            <Button
              variant="outline"
              onClick={() => {
                setDate("")
                setDoctorId("")
                setStatus("")
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonTable rows={10} />
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No appointments found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {date || doctorId || status
              ? "Try adjusting your filters"
              : "Get started by creating a new appointment"}
          </p>
          <Button onClick={() => router.push("/appointments/new")} className="mt-4">
            New Appointment
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt) => {
                  const actions = getActions(apt)
                  return (
                    <TableRow key={apt.id}>
                      <TableCell className="font-mono text-sm">
                        {apt.appointmentNumber}
                      </TableCell>
                      <TableCell>{formatDate(apt.appointmentDate)}</TableCell>
                      <TableCell>
                        {new Date(apt.appointmentTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className="cursor-pointer font-medium hover:text-primary hover:underline"
                          onClick={() => router.push(`/patients/${apt.patient?.id}`)}
                        >
                          {apt.patient?.name || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>{apt.doctor?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(apt.consultationFee)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={apt.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={apt.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={action.onClick}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted ${action.className || "text-foreground"}`}
                              title={action.label}
                            >
                              {action.icon}
                              <span className="hidden sm:inline">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={15}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
