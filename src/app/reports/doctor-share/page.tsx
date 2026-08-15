"use client"

import { useState, useEffect, useCallback } from "react"
import { Users, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/utils"
import type { Doctor } from "@/types"

interface DoctorShareRow {
  doctorId: string
  doctorName: string
  specialization: string
  totalConsultations: number
  grossRevenue: number
  doctorShare: number
  clinicShare: number
}

interface ReportSummary {
  totalConsultations: number
  totalGrossRevenue: number
  totalDoctorShare: number
  totalClinicShare: number
}

export default function DoctorShareReportPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<DoctorShareRow[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReportSummary>({
    totalConsultations: 0,
    totalGrossRevenue: 0,
    totalDoctorShare: 0,
    totalClinicShare: 0,
  })

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [doctorId, setDoctorId] = useState("")

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

      const res = await fetch(`/api/reports/doctor-share?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.report || [])
        setSummary(data.totals || {
          totalConsultations: 0,
          totalGrossRevenue: 0,
          totalDoctorShare: 0,
          totalClinicShare: 0,
        })
      } else {
        toast("Failed to load report", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }, [from, to, doctorId, toast])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Doctor Share Report</h1>
          <p className="text-sm text-muted-foreground">
            Per-doctor breakdown of consultations, revenue, and share calculations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
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
            <Button
              variant="outline"
              onClick={() => {
                setFrom("")
                setTo("")
                setDoctorId("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No data found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead className="text-right">Consultations</TableHead>
                <TableHead className="text-right">Gross Revenue</TableHead>
                <TableHead className="text-right">Share %</TableHead>
                <TableHead className="text-right">Doctor Share</TableHead>
                <TableHead className="text-right">Clinic Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.doctorId}>
                  <TableCell className="font-medium">{row.doctorName}</TableCell>
                  <TableCell className="text-right">{row.totalConsultations}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.grossRevenue)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-medium text-teal-600">
                    {formatCurrency(row.doctorShare)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {formatCurrency(row.clinicShare)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{summary.totalConsultations}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalGrossRevenue)}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right text-teal-600">
                  {formatCurrency(summary.totalDoctorShare)}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatCurrency(summary.totalClinicShare)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
