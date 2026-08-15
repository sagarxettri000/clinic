"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Eye,
  RotateCcw,
  CreditCard,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";

interface Payment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  patient: { id: string; name: string } | null;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  invoice: { id: string; invoiceNumber: string; totalAmount: number } | null;
}

const methodOptions = [
  { value: "", label: "All Methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments")
      .then((res) => (res.ok ? res.json() : { payments: [] }))
      .then((data) => {
        if (!cancelled) setPayments(data.payments || []);
      })
      .catch(() => {
        if (!cancelled) setPayments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = payments;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(q) ||
          (p.patient?.name || "").toLowerCase().includes(q) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q))
      );
    }

    if (methodFilter) {
      result = result.filter((p) => p.paymentMethod === methodFilter);
    }

    if (dateFrom) {
      result = result.filter(
        (p) => new Date(p.paymentDate) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((p) => new Date(p.paymentDate) <= to);
    }

    return result;
  }, [payments, search, methodFilter, dateFrom, dateTo]);

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

  function handleViewReceipt(payment: Payment) {
    if (payment.invoice?.id) {
      window.open(`/billing/invoices/${payment.invoice.id}?print=1`, "_blank");
    }
  }

  function handleRefund(payment: Payment) {
    if (
      confirm(
        `Issue a refund of ${formatCurrency(payment.amount)} for payment ${payment.paymentNumber}?`
      )
    ) {
      window.location.href = `/billing/refunds?paymentId=${payment.id}`;
    }
  }

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 text-sm mt-1">
              View and manage all patient payments
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
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    placeholder="Search by payment#, patient, or reference..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    options={methodOptions}
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                  />
                </div>
              </div>
              {showFilters && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-48">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Payments</p>
                  <p className="text-lg font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cash Payments</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      filtered
                        .filter((p) => p.paymentMethod === "CASH")
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading payments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No payments found</p>
            <p className="text-gray-400 text-sm mt-1">
              {payments.length === 0
                ? "No payments have been recorded yet"
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
                      Payment#
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {payment.paymentNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-sm font-medium text-gray-900">
                          {payment.patient?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {payment.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {payment.referenceNumber || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewReceipt(payment)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="View Receipt"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleRefund(payment)}
                            className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition"
                            title="Refund"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>
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
