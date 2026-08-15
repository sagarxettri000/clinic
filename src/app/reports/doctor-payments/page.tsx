"use client"

import { useState, useEffect } from "react"
import { Stethoscope, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface SettlementRow {
  id: string
  doctor: { name: string; specialization: string } | null
  fromDate: string
  toDate: string
  totalConsultations: number
  doctorShare: number
  amountPaid: number
  remainingPayable: number
  status: string
}

export default function DoctorPaymentsReportPage() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ limit: "200" })
    if (from) params.set("fromDate", from)
    if (to) params.set("toDate", to)
    fetch(`/api/settlements?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { settlements: [] }))
      .then((data) => {
        if (!cancelled) setSettlements(data.settlements || [])
      })
      .catch(() => {
        if (!cancelled) setSettlements([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  const totalPaid = settlements.reduce((s, x) => s + x.amountPaid, 0)
  const totalDue = settlements.reduce((s, x) => s + x.remainingPayable, 0)

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Doctor Payment Report</h1>
          <p className="text-sm text-muted-foreground">
            Doctor settlements, payable amounts, and payment history
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
            <Button
              variant="outline"
              onClick={() => {
                setFrom("")
                setTo("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading report...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-3">
                    <Stethoscope className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid to Doctors</p>
                    <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDue)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settlements</CardTitle>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No settlements in range</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Consultations</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.doctor?.name || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {formatDate(s.fromDate)} - {formatDate(s.toDate)}
                          </TableCell>
                          <TableCell className="text-right">{s.totalConsultations}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.doctorShare)}</TableCell>
                          <TableCell className="text-right text-rose-600">{formatCurrency(s.amountPaid)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.remainingPayable)}</TableCell>
                          <TableCell>{s.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}