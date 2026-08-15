"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  DollarSign,
  FileText,
  CreditCard,
  User,
  Calendar,
  Download,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface InvoiceItem {
  id: string;
  serviceName: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientId: string;
  patient: { id: string; name: string; patientId: string; phone: string | null; email: string | null };
  description: string | null;
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  encounter?: {
    id: string;
    encounterDate: string;
    chiefComplaint: string | null;
    doctor: { id: string; name: string } | null;
  } | null;
}

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function ViewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH",
    referenceNumber: "",
  });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchInvoice();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pay") === "true") {
      setShowPayModal(true);
    }
    if (urlParams.get("print") === "1") {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [invoiceId]);

  async function fetchInvoice() {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setPayForm((prev) => ({
          ...prev,
          amount: data.balance,
        }));
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

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

  async function handlePayment() {
    if (payForm.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    if (payForm.amount > (invoice?.balance || 0)) {
      alert("Amount exceeds balance");
      return;
    }

    setPaying(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: invoice?.patientId,
          invoiceId: invoice?.id,
          amount: payForm.amount,
          paymentDate: payForm.paymentDate,
          paymentMethod: payForm.paymentMethod,
          referenceNumber: payForm.referenceNumber || null,
        }),
      });

      if (res.ok) {
        setShowPayModal(false);
        fetchInvoice();
        setPayForm({
          amount: 0,
          paymentDate: new Date().toISOString().split("T")[0],
          paymentMethod: "CASH",
          referenceNumber: "",
        });
      } else {
        const err = await res.json();
        alert(err.message || "Payment failed");
      }
    } catch {
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    if (!invoice) return
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text("INVOICE", 14, 22)
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235)
    doc.text(invoice.invoiceNumber, 14, 30)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(
      `Date: ${formatDate(invoice.invoiceDate)}`,
      doc.internal.pageSize.getWidth() - 14,
      22,
      { align: "right" }
    )
    doc.text(
      `Status: ${invoice.status}`,
      doc.internal.pageSize.getWidth() - 14,
      28,
      { align: "right" }
    )
    doc.setFontSize(12)
    doc.text("Bill To:", 14, 42)
    doc.setFontSize(11)
    doc.text(invoice.patient?.name || "-", 14, 48)
    doc.setFontSize(9)
    doc.setTextColor(90, 90, 90)
    doc.text(`ID: ${invoice.patient?.patientId || "-"}`, 14, 54)
    doc.text(`Phone: ${invoice.patient?.phone || "-"}`, 14, 59)
    if (invoice.encounter?.doctor?.name) {
      doc.text(`Doctor: Dr. ${invoice.encounter.doctor.name}`, 14, 64)
    }
    if (invoice.encounter?.id) {
      doc.text(`Encounter: ${invoice.encounter.id}`, 14, 69)
    }
    doc.setTextColor(0, 0, 0)
    autoTable(doc, {
      startY: 76,
      head: [["#", "Service", "Description", "Qty", "Unit Price", "Disc", "Total"]],
      body: invoice.items.map((item, index) => [
        String(index + 1),
        item.serviceName,
        item.description || "-",
        String(item.quantity),
        formatCurrency(item.unitPrice),
        item.discount > 0 ? formatCurrency(item.discount) : "-",
        formatCurrency(item.total),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99] },
    })
    const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    doc.setFontSize(10)
    doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 130, afterY)
    if (invoice.discount > 0) {
      doc.text(`Discount: -${formatCurrency(invoice.discount)}`, 130, afterY + 6)
    }
    doc.text(
      `Tax (${invoice.taxPercent}%): ${formatCurrency(invoice.taxAmount)}`,
      130,
      afterY + (invoice.discount > 0 ? 12 : 6)
    )
    doc.setFontSize(12)
    doc.text(`Total: ${formatCurrency(invoice.totalAmount)}`, 130, afterY + (invoice.discount > 0 ? 20 : 14))
    doc.setFontSize(10)
    doc.setTextColor(22, 101, 52)
    doc.text(`Paid: ${formatCurrency(invoice.paidAmount)}`, 130, afterY + (invoice.discount > 0 ? 27 : 21))
    doc.setTextColor(185, 28, 28)
    doc.text(`Balance Due: ${formatCurrency(invoice.balance)}`, 130, afterY + (invoice.discount > 0 ? 33 : 27))
    if (invoice.paymentMethod) {
      doc.setTextColor(0, 0, 0)
      doc.text(
        `Payment Method: ${invoice.paymentMethod.replace("_", " ")}`,
        130,
        afterY + (invoice.discount > 0 ? 39 : 33)
      )
    }
    doc.save(`${invoice.invoiceNumber}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12 text-gray-500">
          Loading invoice...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Invoice not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/billing")}
          >
            Back to Billing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header - not printed */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Invoice {invoice.invoiceNumber}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {formatDate(invoice.invoiceDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <StatusBadge status={invoice.status} />
            {invoice.balance > 0 && (
              <Button onClick={() => setShowPayModal(true)}>
                <DollarSign size={16} />
                Receive Payment
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download size={16} />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={16} />
              Print Receipt
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              <X size={16} />
              Close
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-lg font-mono text-blue-600 mt-1">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} />
                  <span className="text-sm">Date: {formatDate(invoice.invoiceDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <FileText size={14} />
                  <span className="text-sm">Status: </span>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500 mb-1">Bill To</p>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="font-semibold text-gray-900">
                    {invoice.patient?.name}
                  </span>
                </div>
                {invoice.patient?.patientId && (
                  <p className="text-sm text-gray-500 mt-1">
                    Patient ID: {invoice.patient.patientId}
                  </p>
                )}
                {invoice.patient?.phone && (
                  <p className="text-sm text-gray-500">Phone: {invoice.patient.phone}</p>
                )}
                {invoice.encounter?.doctor?.name && (
                  <p className="text-sm text-gray-500">
                    Doctor: Dr. {invoice.encounter.doctor.name}
                  </p>
                )}
                {invoice.encounter?.id && (
                  <p className="text-sm font-mono text-gray-500">
                    Encounter: {invoice.encounter.id}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">
                  {invoice.description || invoice.encounter?.chiefComplaint || "-"}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Service
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Description
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Qty
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Unit Price
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Discount
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.serviceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {item.discount > 0 ? formatCurrency(item.discount) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(invoice.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Tax ({invoice.taxPercent}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Balance Due</span>
                  <span className="font-bold">
                    {formatCurrency(invoice.balance)}
                  </span>
                </div>
                {invoice.paymentMethod && (
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-medium">
                      {invoice.paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-4 bg-gray-50 rounded-lg mb-8">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="border-t p-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard size={18} />
                Payment History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Payment#
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Date
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Amount
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Method
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Reference
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {payment.paymentMethod.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {payment.referenceNumber || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={payment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={18} />
              Receive Payment
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount (Max: {formatCurrency(invoice.balance)})
                </label>
                <Input
                  type="number"
                  min="0"
                  max={invoice.balance}
                  step="0.01"
                  value={payForm.amount || ""}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Payment Date
                </label>
                <Input
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <Select
                  options={paymentMethods}
                  value={payForm.paymentMethod}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reference Number (optional)
                </label>
                <Input
                  placeholder="Transaction reference"
                  value={payForm.referenceNumber}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      referenceNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowPayModal(false)}
                disabled={paying}
              >
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={paying}>
                {paying ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
