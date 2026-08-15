"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
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
    let cancelled = false;
    fetch("/api/expenses/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        if (!cancelled) setCategories(data.categories || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
    setSaving(true);
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
        router.push("/accounts/expenses");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create expense");
        setSaving(false);
      }
    } catch {
      alert("Failed to create expense");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Expense</h1>
            <p className="text-gray-500 text-sm mt-1">Record a new clinic expense</p>
          </div>
          <Link href="/accounts/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} />
              Back to Expenses
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Details</CardTitle>
            <CardDescription>Fill in the details of the expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
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

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/accounts/expenses">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleSubmit} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Create Expense"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}