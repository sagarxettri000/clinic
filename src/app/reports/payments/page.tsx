"use client"

import { useState, useEffect } from "react"
import { Banknote, CalendarDays, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface PaymentRow {
  id: string
  paymentNumber: string
  paymentDate: string
  amount: number
  paymentMethod: string
  status: string
  patient: { name: string; patientId: string } | null
  invoice: { id: string; invoiceNumber: string } | null
}

export default function PaymentReportPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ limit: "100", sortBy: "paymentDate", sortOrder: "desc" })
    if (from) params.set("fromDate", from)
    if (to) params.set("toDate", to)
    fetch(`/api/payments?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { payments: [] }))
      .then((data) => {
        if (!cancelled) setPayments(data.payments || [])
      })
      .catch(() => {
        if (!cancelled) setPayments([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to])

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)

  const methodTotals = new Map<string, number>()
  payments.forEach((p) => {
    methodTotals.set(p.paymentMethod, (methodTotals.get(p.paymentMethod) || 0) + p.amount)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Payment Report</h1>
          <p className="text-sm text-muted-foreground">Collections summary broken down by method</p>
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
                  <div className="rounded-lg bg-emerald-100 p-3">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold">{payments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">By Method</p>
                {methodTotals.size === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-1">
                    {Array.from(methodTotals.entries()).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{method}</span>
                        <span className="font-semibold">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments in range</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.paymentNumber}</TableCell>
                          <TableCell>{formatDate(p.paymentDate)}</TableCell>
                          <TableCell className="font-medium">{p.patient?.name || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{p.invoice?.invoiceNumber || "-"}</TableCell>
                          <TableCell>{p.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(p.amount)}</TableCell>
                          <TableCell>{p.status}</TableCell>
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