"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

interface PatientSummary {
  total: number;
}

interface Doctor {
  id: string;
  name: string;
  consultationFee: number;
  revenueSharePercent: number;
  color?: string;
}

interface Appointment {
  id: string;
  patient: { name: string; phone?: string };
  doctor: { name: string };
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  consultationFee: number;
  paymentStatus: string;
}

interface IncomeExpense {
  income: number;
  expenses: number;
}

interface CashBook {
  balance: number;
}

interface DoctorStats {
  doctorId: string;
  appointmentsCount: number;
  revenue: number;
  doctorShare: number;
  clinicShare: number;
}

interface DashboardData {
  patientCount: number;
  doctors: Doctor[];
  appointments: Appointment[];
  todayFinancials: IncomeExpense;
  cashBalance: number;
  doctorStats: Record<string, DoctorStats>;
  pendingPayments: number;
  doctorPayable: number;
  followUps: {
    total: number;
    completed: number;
    open: number;
    last: string | null;
  };
}

const doctorColors = [
  "from-teal-500 to-teal-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-cyan-500 to-cyan-600",
  "from-sky-500 to-sky-600",
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-purple-500 to-purple-600",
];

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
      </CardContent>
    </Card>
  );
}

function SkeletonDoctorCard() {
  return (
    <Card className="animate-pulse overflow-hidden">
      <div className="h-2 bg-gray-200" />
      <CardContent className="p-5">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-40 rounded bg-gray-200" />
          <div className="h-3 w-36 rounded bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const today = format(new Date(), "yyyy-MM-dd");

        const [
          patientsRes,
          doctorsRes,
          appointmentsRes,
          financialsRes,
          cashBookRes,
          followUpsRes,
        ] = await Promise.all([
          fetch("/api/patients"),
          fetch("/api/doctors"),
          fetch(`/api/appointments?date=${today}`),
          fetch(`/api/reports/income-expense?fromDate=${today}&toDate=${today}`),
          fetch("/api/reports/cash-book"),
          fetch("/api/follow-ups/stats"),
        ]);

        const patientsJson = patientsRes.ok
          ? await patientsRes.json()
          : { patients: [], pagination: { total: 0 } };
        const doctorsJson = doctorsRes.ok
          ? await doctorsRes.json()
          : { doctors: [] };
        const appointmentsJson = appointmentsRes.ok
          ? await appointmentsRes.json()
          : { appointments: [] };
        const financialsJson = financialsRes.ok
          ? await financialsRes.json()
          : {
              summary: {
                totalIncome: 0,
                totalExpenses: 0,
                netBalance: 0,
              },
            };
        const cashBookJson = cashBookRes.ok
          ? await cashBookRes.json()
          : {
              account: null,
              openingBalance: 0,
              transactions: [],
              summary: {
                totalDebit: 0,
                totalCredit: 0,
                closingBalance: 0,
              },
            };

        const doctorsData: Doctor[] = doctorsJson.doctors || [];
        const appointmentsData: Appointment[] = appointmentsJson.appointments || [];

        const doctorStats: Record<string, DoctorStats> = {};
        let pendingPayments = 0;
        let doctorPayable = 0;

        for (const appt of appointmentsData) {
          const docId = appt.doctor?.name || "unknown";
          if (!doctorStats[docId]) {
            doctorStats[docId] = {
              doctorId: docId,
              appointmentsCount: 0,
              revenue: 0,
              doctorShare: 0,
              clinicShare: 0,
            };
          }
          doctorStats[docId].appointmentsCount++;
          doctorStats[docId].revenue += appt.consultationFee;

          if (appt.paymentStatus === "UNPAID" || appt.paymentStatus === "PARTIALLY_PAID") {
            pendingPayments += appt.consultationFee;
          }
        }

        for (const doc of doctorsData) {
          const stats = doctorStats[doc.name];
          if (stats) {
            stats.doctorShare =
              (stats.revenue * (doc.revenueSharePercent ?? 0)) / 100;
            stats.clinicShare =
              stats.revenue - stats.doctorShare;
            doctorPayable += stats.doctorShare;
          }
        }

        setData({
          patientCount: patientsJson.pagination?.total ?? 0,
          doctors: doctorsData,
          appointments: appointmentsData,
          todayFinancials: {
            income: financialsJson.summary?.totalIncome ?? 0,
            expenses: financialsJson.summary?.totalExpenses ?? 0,
          },
          cashBalance:
            cashBookJson.summary?.closingBalance ??
            cashBookJson.openingBalance ??
            0,
          doctorStats,
          pendingPayments,
          doctorPayable,
          followUps: followUpsRes.ok
            ? await followUpsRes.json()
            : { total: 0, completed: 0, open: 0, last: null },
        });
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const today = format(new Date(), "EEEE, dd MMMM yyyy");

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Doctors Today
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonDoctorCard key={i} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Today&apos;s Appointments
          </h2>
          <SkeletonTable />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-teal-600">
              Total Patients
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {data?.patientCount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
              Doctors
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {data?.doctors.length ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
              Today&apos;s Appointments
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {data?.appointments.length ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Today&apos;s Income
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {formatCurrency(data?.todayFinancials.income ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-rose-600">
              Today&apos;s Expenses
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-700">
              {formatCurrency(data?.todayFinancials.expenses ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-100 bg-gradient-to-br from-cyan-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-600">
              Cash Balance
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(data?.cashBalance ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
              Pending Payments
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {formatCurrency(data?.pendingPayments ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
              Doctor Payable
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-700">
              {formatCurrency(data?.doctorPayable ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups summary */}
      <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Follow-ups</h2>
          <Link
            href="/follow-ups"
            className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
          >
            Manage →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/follow-ups?status=ALL" className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:ring-teal-200">
            <p className="text-xs font-medium text-teal-600">Total Follow-ups</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{data?.followUps.total ?? 0}</p>
          </Link>
          <Link href="/follow-ups?status=OPEN" className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:ring-amber-200">
            <p className="text-xs font-medium text-amber-600">Open</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{data?.followUps.open ?? 0}</p>
          </Link>
          <Link href="/follow-ups?status=COMPLETED" className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:ring-emerald-200">
            <p className="text-xs font-medium text-emerald-600">Completed</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{data?.followUps.completed ?? 0}</p>
          </Link>
        </div>
        {data?.followUps.last && (
          <p className="mt-3 text-sm text-gray-500">
            Last recorded:{" "}
            <span className="font-medium text-gray-700">
              {formatDateTime(data.followUps.last)}
            </span>
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Doctors Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.doctors.map((doc, idx) => {
            const stats = data.doctorStats[doc.name];
            const colorClass = doctorColors[idx % doctorColors.length];

            return (
              <Card
                key={doc.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <div
                  className={cn(
                    "h-2 bg-gradient-to-r",
                    colorClass
                  )}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {doc.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Fee: {formatCurrency(doc.consultationFee)} &middot;
                        Share: {doc.revenueSharePercent ?? 0}%
                      </p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {doc.name?.charAt(0) ?? "D"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Appointments
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-gray-800">
                        {stats?.appointmentsCount ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Revenue
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-gray-800">
                        {formatCurrency(stats?.revenue ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Doctor Share
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-teal-600">
                        {formatCurrency(stats?.doctorShare ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Clinic Share
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-blue-600">
                        {formatCurrency(stats?.clinicShare ?? 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Today&apos;s Appointments
          </h2>
          <Link href="/appointments">
            <Button variant="ghost" size="sm" className="text-teal-600">
              View All
            </Button>
          </Link>
        </div>

        {data?.appointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-gray-100 p-4">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                No appointments scheduled for today
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-4 py-3 font-medium text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Patient
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Doctor
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Time
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Fee
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.appointments.map((appt, idx) => (
                    <tr
                      key={appt.id}
                      className="transition-colors hover:bg-teal-50/30"
                    >
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/appointments/${appt.id}`}
                          className="font-medium text-gray-900 hover:text-teal-600 hover:underline"
                        >
                          {appt.patient?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {appt.doctor?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {appt.appointmentTime ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {formatCurrency(appt.consultationFee)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Link href="/appointments/new">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-teal-200 py-5 text-teal-700 hover:bg-teal-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs font-medium">New Appointment</span>
            </Button>
          </Link>

          <Link href="/patients/new">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-blue-200 py-5 text-blue-700 hover:bg-blue-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-xs font-medium">Add Patient</span>
            </Button>
          </Link>

          <Link href="/billing/invoices/new">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-emerald-200 py-5 text-emerald-700 hover:bg-emerald-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span className="text-xs font-medium">Create Invoice</span>
            </Button>
          </Link>

          <Link href="/accounts/expenses/new">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-rose-200 py-5 text-rose-700 hover:bg-rose-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
              <span className="text-xs font-medium">Add Expense</span>
            </Button>
          </Link>

          <Link href="/prescriptions/new">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-violet-200 py-5 text-violet-700 hover:bg-violet-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
              <span className="text-xs font-medium">New Prescription</span>
            </Button>
          </Link>

          <Link href="/reports">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1 border-sky-200 py-5 text-sky-700 hover:bg-sky-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <span className="text-xs font-medium">View Reports</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
