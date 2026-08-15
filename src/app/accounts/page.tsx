"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  category: string | null;
  referenceNumber: string | null;
  accountName: string;
  account: { id: string; name: string; code: string; type: string } | null;
}

interface AccountSummary {
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
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

export default function CashBookPage() {
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<AccountSummary>({
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [txRes, summaryRes] = await Promise.all([
        fetch("/api/reports/cash-book"),
        fetch("/api/reports/cash-book?summary=true"),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }

      if (summaryRes.ok) {
        const summData = await summaryRes.json();
        setSummary({
          openingBalance: summData.openingBalance ?? 0,
          totalDebits: summData.summary?.totalDebit ?? 0,
          totalCredits: summData.summary?.totalCredit ?? 0,
          closingBalance: summData.summary?.closingBalance ?? 0,
        });
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = transactions;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (dateFrom) {
      result = result.filter((t) => new Date(t.date) >= new Date(dateFrom));
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.date) <= to);
    }

    return result;
  }, [transactions, search, categoryFilter, dateFrom, dateTo]);

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

  function exportToCSV() {
    const headers = [
      "Date",
      "Description",
      "Debit",
      "Credit",
      "Balance",
      "Category",
      "Reference",
      "Account",
    ];
    const rows = filtered.map((t) => [
      formatDate(t.date),
      t.description,
      t.debitAmount.toString(),
      t.creditAmount.toString(),
      t.balance.toString(),
      t.category || "",
      t.referenceNumber || "",
      t.account?.name || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-book-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Book</h1>
            <p className="text-gray-500 text-sm mt-1">
              Overview of all financial transactions
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
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Opening Balance</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(summary.openingBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownRight className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Debits</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.totalDebits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credits</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(summary.totalCredits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Closing Balance</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(summary.closingBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-44">
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
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-1">
              {transactions.length === 0
                ? "No transactions have been recorded yet"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ledger Transactions ({filtered.length})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {tx.description}
                          </span>
                          {tx.referenceNumber && (
                            <span className="text-xs text-gray-400 ml-2 font-mono">
                              {tx.referenceNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {tx.debitAmount > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(tx.debitAmount)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {tx.creditAmount > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(tx.creditAmount)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(tx.balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tx.category ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {tx.category}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
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
