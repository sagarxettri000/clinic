"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/utils"

interface CashTransaction {
  id: string
  date: string
  description: string
  debitAmount: number
  creditAmount: number
  balance: number
  referenceNumber: string | null
  category: string | null
}

interface CashBookData {
  openingBalance: number
  closingBalance: number
  transactions: CashTransaction[]
  summary: {
    totalDebit: number
    totalCredit: number
    closingBalance: number
  }
}

export default function CashBookReportPage() {
  const { toast } = useToast()
  const [data, setData] = useState<CashBookData>({
    openingBalance: 0,
    closingBalance: 0,
    transactions: [],
    summary: {
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
    },
  })
  const [loading, setLoading] = useState(true)

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set("fromDate", from)
      if (to) params.set("toDate", to)

      const res = await fetch(`/api/reports/cash-book?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData({
          openingBalance: result.openingBalance ?? 0,
          closingBalance: result.closingBalance ?? 0,
          transactions: result.transactions ?? [],
          summary: {
            totalDebit: result.summary?.totalDebit ?? 0,
            totalCredit: result.summary?.totalCredit ?? 0,
            closingBalance: result.summary?.closingBalance ?? 0,
          },
        })
      } else {
        toast("Failed to load report", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }, [from, to, toast])

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
          <h1 className="text-2xl font-bold">Cash Ledger Report</h1>
          <p className="text-sm text-muted-foreground">
            Cash book with opening balance, transactions, and closing balance
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
        <SkeletonTable rows={10} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {formatCurrency(data.openingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Debit (In)</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.summary.totalDebit)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Credit (Out)</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  {formatCurrency(data.summary.totalCredit)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {data.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No transactions found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your date range
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Debit (In)</TableHead>
                        <TableHead className="text-right">Credit (Out)</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="font-semibold bg-blue-50/50">
                        <TableCell colSpan={6}>Opening Balance</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.openingBalance)}</TableCell>
                      </TableRow>
                      {data.transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>{formatDate(txn.date)}</TableCell>
                          <TableCell>{txn.description}</TableCell>
                          <TableCell>{txn.category || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {txn.referenceNumber || "-"}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">
                            {txn.debitAmount > 0 ? formatCurrency(txn.debitAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-right text-rose-600 font-medium">
                            {txn.creditAmount > 0 ? formatCurrency(txn.creditAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(txn.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-emerald-50/50">
                        <TableCell colSpan={5}>Closing Balance</TableCell>
                        <TableCell className="text-right text-emerald-600">
                  {formatCurrency(data.summary.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right text-rose-600">
                  {formatCurrency(data.summary.totalCredit)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={6}>Closing Balance</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.closingBalance)}</TableCell>
                      </TableRow>
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
