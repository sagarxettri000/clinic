"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, TrendingDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/utils"

interface CategoryBreakdown {
  category: string
  amount: number
}

interface IncomeExpenseData {
  summary: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
  }
  incomeByCategory: CategoryBreakdown[]
  expenseByCategory: CategoryBreakdown[]
}

export default function IncomeExpenseReportPage() {
  const { toast } = useToast()
  const [data, setData] = useState<IncomeExpenseData>({
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
    },
    incomeByCategory: [],
    expenseByCategory: [],
  })
  const [loading, setLoading] = useState(true)

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)

      const res = await fetch(`/api/reports/income-expense?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData({
          summary: {
            totalIncome: result.summary?.totalIncome ?? 0,
            totalExpenses: result.summary?.totalExpenses ?? 0,
            netBalance: result.summary?.netBalance ?? 0,
          },
          incomeByCategory: result.incomeBreakdown ?? [],
          expenseByCategory: result.expenseBreakdown ?? [],
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
          <h1 className="text-2xl font-bold">Income & Expense Report</h1>
          <p className="text-sm text-muted-foreground">
            Financial summary with income and expense breakdowns
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="mt-3 h-8 w-20 rounded bg-gray-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-3">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(data.summary.totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-3">
                    <TrendingDown className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-rose-600">
                            {formatCurrency(data.summary.totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <span className="text-lg font-bold text-blue-600">Rs</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Balance</p>
                    <p className={`text-2xl font-bold ${data.summary.netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(data.summary.netBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Income by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.incomeByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No income data</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.incomeByCategory.map((item) => (
                          <TableRow key={item.category}>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right text-emerald-600">
                      {formatCurrency(data.summary.totalIncome)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.expenseByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expense data</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.expenseByCategory.map((item) => (
                          <TableRow key={item.category}>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right font-medium text-rose-600">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right text-rose-600">
                      {formatCurrency(data.summary.totalExpenses)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
