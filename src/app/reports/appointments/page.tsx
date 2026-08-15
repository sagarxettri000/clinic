"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarDays, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/utils"
import type { Doctor } from "@/types"

interface AppointmentRow {
  id: string
  appointmentNumber: number
  patient: { name: string; phone: string; patientId: string }
  doctor: { name: string }
  appointmentDate: string
  appointmentTime: string
  consultationFee: number
  status: string
  paymentStatus: string
  paymentMethod: string | null
}

interface ReportSummary {
  totalAppointments: number
  totalRevenue: number
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

export default function AppointmentReportPage() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReportSummary>({ totalAppointments: 0, totalRevenue: 0 })

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
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

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      if (doctorId) params.set("doctorId", doctorId)
      if (status) params.set("status", status)

      const res = await fetch(`/api/reports/appointments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
        setSummary(data.summary || { totalAppointments: 0, totalRevenue: 0 })
      } else {
        toast("Failed to load report", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }, [from, to, doctorId, status, toast])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = () => {
    window.print()
  }

  const handleCSV = () => {
    if (appointments.length === 0) {
      toast("No data to export", "error")
      return
    }

    const headers = ["#", "Patient", "Phone", "Doctor", "Date", "Time", "Fee", "Status", "Payment Status"]
    const rows = appointments.map((a) => [
      a.appointmentNumber,
      a.patient?.name,
      a.patient?.phone,
      a.doctor?.name,
      a.appointmentDate,
      a.appointmentTime,
      a.consultationFee,
      a.status,
      a.paymentStatus,
    ])

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `appointment-report-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Appointment Date-Wise Report</h1>
          <p className="text-sm text-muted-foreground">
            View appointments filtered by date, doctor, and status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="From Date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="To Date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Select
              label="Doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              options={doctorOptions}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={statusOptions}
            />
            <Button
              variant="outline"
              onClick={() => {
                setFrom("")
                setTo("")
                setDoctorId("")
                setStatus("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Appointments</p>
              <p className="text-2xl font-bold">{summary.totalAppointments}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-emerald-100 p-3">
              <span className="text-lg font-bold text-emerald-600">Rs</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <SkeletonTable rows={10} />
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No appointments found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell className="font-mono text-sm">
                    {apt.appointmentNumber}
                  </TableCell>
                  <TableCell className="font-medium">{apt.patient?.name}</TableCell>
                  <TableCell>{apt.patient?.phone || "-"}</TableCell>
                  <TableCell>{apt.doctor?.name}</TableCell>
                  <TableCell>{apt.appointmentDate}</TableCell>
                  <TableCell>{apt.appointmentTime}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(apt.consultationFee)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apt.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apt.paymentStatus} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={6}>Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(summary.totalRevenue)}
                </TableCell>
                <TableCell colSpan={2}>{summary.totalAppointments} appointments</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
