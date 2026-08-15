"use client"

import { useState, useEffect } from "react"
import { Receipt, CheckCircle2, AlertCircle, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface InvoiceRow {
  id: string
  invoiceNumber: string
  invoiceDate: string
  status: string
  totalAmount: number
  paidAmount: number
  balance: number
  patient: { name: string; patientId: string } | null
}

export default function InvoiceReportPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/invoices?limit=100&sortBy=invoiceDate&sortOrder=desc")
      .then((res) => (res.ok ? res.json() : { invoices: [] }))
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices || [])
      })
      .catch(() => {
        if (!cancelled) setInvoices([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const day = (d: string) => new Date(d).toISOString().slice(0, 10)

  const filtered = invoices.filter((inv) => {
    const d = day(inv.invoiceDate)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  const totalBilled = filtered.reduce((s, inv) => s + inv.totalAmount, 0)
  const totalPaid = filtered.reduce((s, inv) => s + inv.paidAmount, 0)
  const totalOutstanding = filtered.reduce((s, inv) => s + inv.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Invoice Report</h1>
          <p className="text-sm text-muted-foreground">Billing summary, collections, and outstanding balances</p>
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
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Billed</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalBilled)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-3">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalOutstanding)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices in range</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                          <TableCell className="font-medium">{inv.patient?.name || "-"}</TableCell>
                          <TableCell>{inv.status}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatCurrency(inv.paidAmount)}</TableCell>
                          <TableCell className="text-right text-rose-600">{formatCurrency(inv.balance)}</TableCell>
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