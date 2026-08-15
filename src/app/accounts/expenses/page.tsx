"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Calendar,
  DollarSign,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModalForm } from "@/components/ui/modal-form";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: { id: string; name: string } | null;
  description: string;
  amount: number;
  paymentMethod: string;
  supplier: string | null;
  notes: string | null;
}

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
    description: "",
    amount: 0,
    paymentMethod: "CASH",
    supplier: "",
    notes: "",
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  async function fetchExpenses() {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      } else {
        setExpenses([]);
      }
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/expenses/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      setCategories([]);
    }
  }

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const formCategoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const filtered = useMemo(() => {
    let result = expenses;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.expenseNumber.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.supplier && e.supplier.toLowerCase().includes(q))
      );
    }

    if (categoryFilter) {
      result = result.filter((e) => e.category?.id === categoryFilter);
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
  }, [expenses, search, categoryFilter, dateFrom, dateTo]);

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
      categoryId: "",
      description: "",
      amount: 0,
      paymentMethod: "CASH",
      supplier: "",
      notes: "",
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.categoryId) {
      alert("Please select a category");
      return;
    }
    if (!form.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (form.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          supplier: form.supplier || null,
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create expense");
      }
    } catch {
      alert("Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track and manage clinic expenses
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
              Create Expense
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
                    placeholder="Search by expense#, description, or supplier..."
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
              </div>
              {showFilters && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-44">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-44">
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
                <div className="p-2 bg-red-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-lg font-bold">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Tag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Categories</p>
                  <p className="text-lg font-bold">{categories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading expenses...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No expenses found</p>
            <p className="text-gray-400 text-sm mt-1">
              {expenses.length === 0
                ? "Record your first expense to get started"
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
                      Expense#
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Method
                    </th>
                     <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Supplier
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {expense.expenseNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(expense.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {expense.category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 line-clamp-1 max-w-[250px]">
                          {expense.description}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {expense.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {expense.supplier || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Expense Modal */}
      <ModalForm
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Expense"
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Create Expense"}
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
                Category *
              </label>
              <Select
                options={formCategoryOptions}
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, categoryId: e.target.value }))
                }
                placeholder="Select category"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description *
            </label>
            <Input
              placeholder="Expense description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount (NPR) *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Payment Method *
              </label>
              <Select
                options={paymentMethodOptions}
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Supplier (optional)
            </label>
            <Input
              placeholder="Supplier or vendor name"
              value={form.supplier}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, supplier: e.target.value }))
              }
            />
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
