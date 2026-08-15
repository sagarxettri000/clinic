"use client"

import { useState, useEffect } from "react"
import { Undo2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface RefundRow {
  id: string
  refundNumber: string
  refundDate: string
  amount: number
  reason: string
  refundMethod: string
  status: string
  patient: { name: string; patientId: string } | null
  payment: { paymentNumber: string } | null
}

export default function RefundReportPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/refunds?limit=100&sortBy=refundDate&sortOrder=desc")
      .then((res) => (res.ok ? res.json() : { refunds: [] }))
      .then((data) => {
        if (!cancelled) setRefunds(data.refunds || [])
      })
      .catch(() => {
        if (!cancelled) setRefunds([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const day = (d: string) => new Date(d).toISOString().slice(0, 10)

  const filtered = refunds.filter((r) => {
    const d = day(r.refundDate)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  const totalRefunded = filtered.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Refund Report</h1>
          <p className="text-sm text-muted-foreground">Refunds issued against payments</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="no-print">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input label="From Date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To Date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-3">
                    <Undo2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Refunded</p>
                    <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalRefunded)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Refund Count</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No refunds in range</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Refund No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.refundNumber}</TableCell>
                          <TableCell>{formatDate(r.refundDate)}</TableCell>
                          <TableCell className="font-medium">{r.patient?.name || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{r.payment?.paymentNumber || "-"}</TableCell>
                          <TableCell className="text-sm">{r.reason}</TableCell>
                          <TableCell>{r.refundMethod}</TableCell>
                          <TableCell className="text-right font-medium text-rose-600">{formatCurrency(r.amount)}</TableCell>
                          <TableCell>{r.status}</TableCell>
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