"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Calendar,
  DollarSign,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModalForm } from "@/components/ui/modal-form";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LedgerEntry {
  id: string;
  transactionNumber: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  accountId: string;
  accountName: string;
  accountCode: string;
  account: { id: string; name: string; code: string; type: string } | null;
  category: string | null;
  referenceNumber: string | null;
  notes: string | null;
}

const categoryOptions = [
  { value: "", label: "All Categories" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "LAB", label: "Lab" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "EXPENSE", label: "Expense" },
  { value: "REFUND", label: "Refund" },
  { value: "OTHER", label: "Other" },
];

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    debitAmount: 0,
    creditAmount: 0,
    accountId: "",
    category: "",
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/ledger");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.transactions || []);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch {
      setAccounts([]);
    }
  }

  const accountOptions = useMemo(
    () => [
      { value: "", label: "All Accounts" },
      ...accounts.map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    ],
    [accounts]
  );

  const formAccountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    [accounts]
  );

  const filtered = useMemo(() => {
    let result = entries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.transactionNumber.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q))
      );
    }

    if (accountFilter) {
      result = result.filter((e) => e.accountId === accountFilter);
    }

    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (dateFrom) {
      result = result.filter((e) => new Date(e.date) >= new Date(dateFrom));
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.date) <= to);
    }

    return result;
  }, [entries, search, accountFilter, categoryFilter, dateFrom, dateTo]);

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

  function openModal() {
    setForm({
      date: new Date().toISOString().split("T")[0],
      description: "",
      debitAmount: 0,
      creditAmount: 0,
      accountId: "",
      category: "",
      referenceNumber: "",
      notes: "",
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.accountId) {
      alert("Please select an account");
      return;
    }
    if (!form.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (form.debitAmount <= 0 && form.creditAmount <= 0) {
      alert("Please enter either a debit or credit amount");
      return;
    }
    if (form.debitAmount > 0 && form.creditAmount > 0) {
      alert("Please enter either debit or credit, not both");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referenceNumber: form.referenceNumber || null,
          notes: form.notes || null,
          category: form.category || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchEntries();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create entry");
      }
    } catch {
      alert("Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  }

  const totalDebits = filtered.reduce((sum, e) => sum + e.debitAmount, 0);
  const totalCredits = filtered.reduce((sum, e) => sum + e.creditAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-gray-500 text-sm mt-1">
              Complete record of all financial transactions
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
            <Button onClick={openModal}>
              <Plus size={16} />
              Manual Entry
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Entries</p>
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
                  <p className="text-sm text-gray-500">Total Debits</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totalDebits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credits</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(totalCredits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Accounts</p>
                  <p className="text-lg font-bold">{accounts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
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
                      placeholder="Search by transaction#, description, or reference..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="w-full sm:w-56">
                    <Select
                      options={accountOptions}
                      value={accountFilter}
                      onChange={(e) => setAccountFilter(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      options={categoryOptions}
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-44">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      From Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-44">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      To Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ledger Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-1">
              {entries.length === 0
                ? "No ledger entries have been recorded yet"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ledger Entries ({filtered.length})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Txn#
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {entry.transactionNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {entry.description}
                          </span>
                          {entry.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                           <span className="text-sm font-medium text-gray-900">
                            {entry.account?.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-1 font-mono">
                            {entry.account?.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.debitAmount > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(entry.debitAmount)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.creditAmount > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(entry.creditAmount)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(entry.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {entry.category ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {entry.category}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {entry.referenceNumber || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Manual Entry Modal */}
      <ModalForm
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Manual Ledger Entry"
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Create Entry"}
        isLoading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Account *
              </label>
              <Select
                options={formAccountOptions}
                value={form.accountId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, accountId: e.target.value }))
                }
                placeholder="Select account"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description *
            </label>
            <Input
              placeholder="Transaction description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Debit Amount (NPR)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.debitAmount || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    debitAmount: parseFloat(e.target.value) || 0,
                    creditAmount: 0,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Credit Amount (NPR)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.creditAmount || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    creditAmount: parseFloat(e.target.value) || 0,
                    debitAmount: 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Category (optional)
              </label>
              <Select
                options={categoryOptions.filter((c) => c.value !== "")}
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="Select category"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reference Number (optional)
              </label>
              <Input
                placeholder="Reference #"
                value={form.referenceNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    referenceNumber: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <Textarea
              placeholder="Additional notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
