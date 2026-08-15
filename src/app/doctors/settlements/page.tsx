"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Wallet, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";

interface Doctor {
  id: string;
  name: string;
}

interface Settlement {
  id: string;
  doctor: { id: string; name: string; specialization: string } | null;
  fromDate: string;
  toDate: string;
  totalConsultations: number;
  grossRevenue: number;
  discounts: number;
  refunds: number;
  doctorShare: number;
  amountPaid: number;
  remainingPayable: number;
  status: string;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partially Paid" },
];

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/settlements?limit=100").then((r) =>
        r.ok ? r.json() : { settlements: [] }
      ),
      fetch("/api/doctors?limit=100").then((r) =>
        r.ok ? r.json() : { doctors: [] }
      ),
    ])
      .then(([settRes, docRes]) => {
        if (cancelled) return;
        setSettlements(settRes.settlements || []);
        setDoctors(docRes.doctors || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = settlements;
    if (doctorFilter) {
      result = result.filter((s) => s.doctor?.id === doctorFilter);
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [settlements, doctorFilter, statusFilter]);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-NP", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const totalPaid = filtered.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalDue = filtered.reduce((sum, s) => sum + s.remainingPayable, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Settlements</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track payments made to doctors
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
              Filters
            </Button>
            <Link href="/doctors">
              <Button size="sm">New Settlement</Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-56">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Doctor
                  </label>
                  <Select
                    options={[
                      { value: "", label: "All Doctors" },
                      ...doctors.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Status
                  </label>
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Settlements</p>
                  <p className="text-lg font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Due</p>
                  <p className="text-lg font-bold">{formatCurrency(totalDue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading settlements...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No settlements found</p>
            <p className="text-gray-400 text-sm mt-1">
              {settlements.length === 0
                ? "No settlements have been recorded yet"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Consultations
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Doctor Share
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Due
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <Link
                          href={`/doctors/${s.doctor?.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {s.doctor?.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {s.doctor?.specialization}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(s.fromDate)} - {formatDate(s.toDate)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {s.totalConsultations}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(s.doctorShare)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-green-600">
                          {formatCurrency(s.amountPaid)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-orange-600">
                          {formatCurrency(s.remainingPayable)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}