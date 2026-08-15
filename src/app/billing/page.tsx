"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  Edit,
  DollarSign,
  CreditCard,
  RotateCcw,
  Printer,
  FileText,
  Receipt,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  patient: { id: string; name: string };
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
}

type Tab = "invoices" | "payments" | "refunds";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("invoices");

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      } else {
        setInvoices([]);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

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
    return result;
  }, [invoices, search, statusFilter]);

  function formatCurrency(amount: number) {
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

  function handleView(id: string) {
    window.location.href = `/billing/invoices/${id}`;
  }

  function handleEdit(id: string) {
    window.location.href = `/billing/invoices/${id}?edit=true`;
  }

  function handleReceivePayment(id: string) {
    window.location.href = `/billing/invoices/${id}?pay=true`;
  }

  function handlePrint(id: string) {
    window.open(`/billing/invoices/${id}?print=true`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage invoices, payments, and refunds
            </p>
          </div>
          <Link
            href="/billing/invoices/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Create Invoice
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {[
            { key: "invoices" as Tab, label: "Invoices", icon: FileText },
            { key: "payments" as Tab, label: "Payments", icon: CreditCard },
            { key: "refunds" as Tab, label: "Refunds", icon: RotateCcw },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                if (key === "payments") window.location.href = "/billing/payments";
                if (key === "refunds") window.location.href = "/billing/refunds";
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  placeholder="Search by invoice # or patient..."
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
                  placeholder="All Statuses"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-lg font-bold">{invoices.length}</p>
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
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      invoices.reduce((sum, inv) => sum + inv.balance, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-lg font-bold">
                    {invoices.filter((inv) => inv.status === "OVERDUE").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No invoices found</p>
            <p className="text-gray-400 text-sm mt-1">
              {invoices.length === 0
                ? "Create your first invoice to get started"
                : "Try a different search term"}
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
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {inv.patient?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-green-600 font-medium">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(inv.id)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(inv.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          {inv.balance > 0 && (
                            <button
                              onClick={() => handleReceivePayment(inv.id)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                              title="Receive Payment"
                            >
                              <DollarSign size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrint(inv.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                            title="Print"
                          >
                            <Printer size={16} />
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
