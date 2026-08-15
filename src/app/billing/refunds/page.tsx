"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  Filter,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { ModalForm } from "@/components/ui/modal-form";

interface Refund {
  id: string;
  refundNumber: string;
  refundDate: string;
  patient: { id: string; name: string } | null;
  amount: number;
  reason: string;
  refundMethod: string;
  status: string;
  paymentNumber: string;
}

interface Payment {
  id: string;
  paymentNumber: string;
  patient: { id: string; name: string } | null;
  amount: number;
  paymentDate: string;
  invoice: { id: string; invoiceNumber: string; totalAmount: number } | null;
}

const methodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [form, setForm] = useState({
    paymentId: "",
    amount: 0,
    reason: "",
    refundMethod: "CASH",
  });

  useEffect(() => {
    fetchRefunds();
  }, []);

  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get("paymentId");
    if (paymentId) {
      fetch("/api/payments?limit=100")
        .then((res) => (res.ok ? res.json() : { payments: [] }))
        .then((data) => {
          const match = (data.payments || []).find(
            (p: Payment) => p.id === paymentId
          );
          if (match) {
            setShowModal(true);
            selectPayment(match);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (showModal && paymentSearch.length >= 2) {
      fetchPayments();
    }
  }, [paymentSearch, showModal]);

  async function fetchRefunds() {
    try {
      const res = await fetch("/api/refunds");
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds || []);
      } else {
        setRefunds([]);
      }
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayments() {
    try {
      const res = await fetch(
        `/api/payments?search=${encodeURIComponent(paymentSearch)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch {
      setPayments([]);
    }
  }

  function selectPayment(payment: Payment) {
    setSelectedPayment(payment);
    setForm((prev) => ({
      ...prev,
      paymentId: payment.id,
      amount: payment.amount,
    }));
    setPaymentSearch(payment.paymentNumber);
    setPayments([]);
  }

  const filtered = useMemo(() => {
    if (!search) return refunds;
    const q = search.toLowerCase();
    return refunds.filter(
      (r) =>
        r.refundNumber.toLowerCase().includes(q) ||
        (r.patient?.name || "").toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    );
  }, [refunds, search]);

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
      paymentId: "",
      amount: 0,
      reason: "",
      refundMethod: "CASH",
    });
    setSelectedPayment(null);
    setPaymentSearch("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.paymentId) {
      alert("Please select a payment to refund");
      return;
    }
    if (form.amount <= 0) {
      alert("Refund amount must be greater than 0");
      return;
    }
    if (!form.reason.trim()) {
      alert("Please enter a reason for the refund");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowModal(false);
        fetchRefunds();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create refund");
      }
    } catch {
      alert("Failed to create refund");
    } finally {
      setSubmitting(false);
    }
  }

  const totalRefunded = filtered.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage patient payment refunds
            </p>
          </div>
          <Button onClick={openModal}>
            <Plus size={16} />
            Create Refund
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                placeholder="Search by refund#, patient, or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Refunds</p>
                  <p className="text-lg font-bold">{filtered.length}</p>
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
                  <p className="text-sm text-gray-500">Total Refunded</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totalRefunded)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-lg font-bold">
                    {
                      filtered.filter((r) => r.status === "PENDING").length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading refunds...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <RotateCcw size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No refunds found</p>
            <p className="text-gray-400 text-sm mt-1">
              {refunds.length === 0
                ? "No refunds have been processed yet"
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
                      Refund#
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
                      Reason
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-orange-600">
                          {refund.refundNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(refund.refundDate)}
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-sm font-medium text-gray-900">
                          {refund.patient?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(refund.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 line-clamp-1 max-w-[200px]">
                          {refund.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {refund.refundMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={refund.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Refund Modal */}
      <ModalForm
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Refund"
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Processing..." : "Submit Refund"}
        isLoading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          {/* Payment Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Payment *
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                placeholder="Search payment by number..."
                value={paymentSearch}
                onChange={(e) => {
                  setPaymentSearch(e.target.value);
                  setSelectedPayment(null);
                  setForm((prev) => ({ ...prev, paymentId: "", amount: 0 }));
                }}
                className="pl-9"
              />
            </div>
            {payments.length > 0 && !selectedPayment && (
              <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {payments.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => selectPayment(payment)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {payment.paymentNumber}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Intl.NumberFormat("en-NP", {
                          style: "currency",
                          currency: "NPR",
                          minimumFractionDigits: 0,
                        }).format(payment.amount)}
                      </span>
                    </div>
                     <div className="text-xs text-gray-400">
                      {payment.patient?.name} •{" "}
                      {new Date(payment.paymentDate).toLocaleDateString("en-NP")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Payment Info */}
          {selectedPayment && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedPayment.paymentNumber}
                  </p>
                   <p className="text-xs text-blue-600">
                    {selectedPayment.patient?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-900">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                  {selectedPayment.invoice?.invoiceNumber && (
                    <p className="text-xs text-blue-600">
                      Invoice: {selectedPayment.invoice.invoiceNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Refund Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Refund Amount *
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

          {/* Refund Method */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Refund Method *
            </label>
            <Select
              options={methodOptions}
              value={form.refundMethod}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, refundMethod: e.target.value }))
              }
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason for Refund *
            </label>
            <Textarea
              placeholder="Enter reason for the refund..."
              value={form.reason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
