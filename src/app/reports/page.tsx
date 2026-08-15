"use client"

import Link from "next/link"
import {
  CalendarDays,
  Users,
  TrendingUp,
  BookOpen,
  UserCheck,
  FileText,
  CreditCard,
  RotateCcw,
  Stethoscope,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const reports = [
  {
    title: "Appointment Date-Wise Report",
    description: "View appointments filtered by date range, doctor, and status with revenue summary.",
    href: "/reports/appointments",
    icon: CalendarDays,
    color: "text-blue-600 bg-blue-100",
  },
  {
    title: "Doctor Share Report",
    description: "Per-doctor breakdown of consultations, gross revenue, and share calculations.",
    href: "/reports/doctor-share",
    icon: Users,
    color: "text-teal-600 bg-teal-100",
  },
  {
    title: "Income & Expense Report",
    description: "Summary of total income, expenses, and net balance with category breakdowns.",
    href: "/reports/income-expense",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    title: "Cash Ledger Report",
    description: "Cash book with opening balance, all transactions, and closing balance.",
    href: "/reports/cash-book",
    icon: BookOpen,
    color: "text-amber-600 bg-amber-100",
  },
  {
    title: "Patient Report",
    description: "Patient demographics, visit history, and registration statistics.",
    href: "/reports/patients",
    icon: UserCheck,
    color: "text-violet-600 bg-violet-100",
  },
  {
    title: "Invoice Report",
    description: "Invoice details with amounts, payments, and outstanding balances.",
    href: "/reports/invoices",
    icon: FileText,
    color: "text-indigo-600 bg-indigo-100",
  },
  {
    title: "Payment Report",
    description: "All payment transactions with methods, amounts, and status.",
    href: "/reports/payments",
    icon: CreditCard,
    color: "text-green-600 bg-green-100",
  },
  {
    title: "Refund Report",
    description: "Refund transactions with reasons, amounts, and processing status.",
    href: "/reports/refunds",
    icon: RotateCcw,
    color: "text-orange-600 bg-orange-100",
  },
  {
    title: "Doctor Payment Report",
    description: "Doctor settlements, payable amounts, and payment history.",
    href: "/reports/doctor-payments",
    icon: Stethoscope,
    color: "text-rose-600 bg-rose-100",
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          View and generate clinic reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`rounded-lg p-3 ${report.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{report.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
