"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Plus,
  Printer,
  Receipt,
  DollarSign,
  Wallet,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  patient: { id: string; name: string } | null;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/invoices?limit=100")
      .then((res) => (res.ok ? res.json() : { invoices: [] }))
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices || []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = invoices;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.patient?.name || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    if (dateFrom) {
      result = result.filter(
        (inv) => new Date(inv.invoiceDate) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((inv) => new Date(inv.invoiceDate) <= to);
    }

    return result;
  }, [invoices, search, statusFilter, dateFrom, dateTo]);

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

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const outstanding = filtered.reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-500 text-sm mt-1">
              View and manage all patient invoices
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
            <Link href="/billing/invoices/new">
              <Button size="sm">
                <Plus size={14} />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

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
                    placeholder="Search by invoice#, patient..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-lg font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Billed</p>
                  <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
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
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold">{formatCurrency(outstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No invoices found</p>
            <p className="text-gray-400 text-sm mt-1">
              {invoices.length === 0
                ? "No invoices have been created yet"
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
                      Invoice#
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
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Balance
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
                  {filtered.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <Link
                          href={`/billing/invoices/${invoice.id}`}
                          className="text-sm font-mono font-semibold text-blue-600 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.patient?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-green-600">
                          {formatCurrency(invoice.paidAmount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-orange-600">
                          {formatCurrency(invoice.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/billing/invoices/${invoice.id}`}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="View Invoice"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/billing/invoices/${invoice.id}?print=1`}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                            title="Print Invoice"
                          >
                            <Printer size={16} />
                          </Link>
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
