"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  ArrowLeft,
  Search,
  FileText,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Patient {
  id: string;
  name: string;
  patientId: string;
  phone: string | null;
}

interface LineItem {
  id: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface EncounterRef {
  id: string;
  encounterDate: string;
  chiefComplaint: string | null;
  doctor: { id: string; name: string } | null;
}

interface CreatedInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const encounterId = searchParams.get("encounterId");
  const followUpId = searchParams.get("followUpId");
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [encounter, setEncounter] = useState<EncounterRef | null>(null);
  const [created, setCreated] = useState<CreatedInvoice | null>(null);

  const [form, setForm] = useState({
    patientId: "",
    patientName: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    description: "",
    taxPercent: 0,
    notes: "",
    paidAmount: 0,
    paymentMethod: "CASH",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      serviceName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
    },
  ]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetchPatients();
    } else {
      setPatients([]);
    }
  }, [patientSearch]);

  useEffect(() => {
    if (patientId) {
      fetch(`/api/patients/${patientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((p) => {
          if (p) {
            setForm((prev) => ({
              ...prev,
              patientId: p.id,
              patientName: p.name,
            }));
            setPatientSearch(p.name);
          }
        })
        .catch(() => {});
    }
  }, [patientId]);

  useEffect(() => {
    if (encounterId) {
      fetch(`/api/encounters/${encounterId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((enc) => {
          if (!enc) return;
          setEncounter({
            id: enc.id,
            encounterDate: enc.encounterDate,
            chiefComplaint: enc.chiefComplaint,
            doctor: enc.doctor ? { id: enc.doctor.id, name: enc.doctor.name } : null,
          });
          if (enc.patient?.id) {
            setForm((prev) => ({ ...prev, patientId: enc.patient.id, patientName: enc.patient.name }));
            setPatientSearch(enc.patient.name);
          }
          if (enc.services?.length > 0) {
            const prefill = enc.services
              .filter((s: { service?: { name?: string } }) => s.service?.name)
              .map((s: { service: { name: string }; quantity: number; price: number }) => ({
                id: s.service.name + s.quantity,
                serviceName: s.service.name,
                description: "",
                quantity: s.quantity,
                unitPrice: s.price,
                discount: 0,
              }));
            if (prefill.length > 0) {
              setLineItems(prefill);
            }
          }
        })
        .catch(() => {});
    }
  }, [encounterId]);

  async function fetchPatients() {
    try {
      const res = await fetch(
        `/api/patients?search=${encodeURIComponent(patientSearch)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch {
      setPatients([]);
    }
  }

  function selectPatient(patient: Patient) {
    setForm((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
    }));
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);
    setPatients([]);
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        serviceName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateLineItem(
    id: string,
    field: keyof LineItem,
    value: string | number
  ) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function getLineTotal(item: LineItem): number {
    return item.quantity * item.unitPrice - item.discount;
  }

  const subtotal = lineItems.reduce((sum, item) => sum + getLineTotal(item), 0);
  const taxAmount = (subtotal * form.taxPercent) / 100;
  const total = subtotal + taxAmount;

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  async function handleSubmit() {
    if (!form.patientId) {
      alert("Please select a patient");
      return;
    }
    if (lineItems.every((item) => !item.serviceName)) {
      alert("Please add at least one line item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: form.patientId,
        encounterId: encounterId || undefined,
        followUpId: followUpId || undefined,
        invoiceDate: form.invoiceDate,
        description: form.description,
        taxPercent: form.taxPercent,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
        paidAmount: form.paidAmount || 0,
        items: lineItems
          .filter((item) => item.serviceName)
          .map((item) => ({
            serviceName: item.serviceName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCreated({
          id: data.id,
          invoiceNumber: data.invoiceNumber,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          balance: data.balance,
        });
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create invoice");
      }
    } catch {
      alert("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create Invoice
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Create a new patient invoice
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPrintPreview(true)}
              disabled={submitting}
            >
              <Printer size={16} />
              Print Preview
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save size={16} />
              {submitting ? "Saving..." : "Create Invoice"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Patient *
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      placeholder="Search patient by name or ID..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientDropdown(true);
                        if (form.patientId) {
                          setForm((prev) => ({
                            ...prev,
                            patientId: "",
                            patientName: "",
                          }));
                        }
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="pl-9"
                    />
                  </div>
                  {showPatientDropdown && patients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {patients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => selectPatient(patient)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">
                            {patient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.patientId}{" "}
                            {patient.phone && `• ${patient.phone}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {encounter && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                      <Calendar size={16} className="text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Linked Encounter
                        </p>
                        <p className="text-blue-700">
                          {new Date(encounter.encounterDate).toLocaleDateString("en-NP")}
                          {" - "}
                          {encounter.chiefComplaint || "No complaint"}
                          {encounter.doctor && ` • Dr. ${encounter.doctor.name}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Invoice Date
                    </label>
                    <Input
                      type="date"
                      value={form.invoiceDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          invoiceDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tax (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxPercent || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          taxPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Input
                    placeholder="Invoice description (optional)"
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus size={14} />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Item {index + 1}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Service Name *
                        </label>
                        <Input
                          placeholder="e.g. Consultation"
                          value={item.serviceName}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "serviceName",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Description
                        </label>
                        <Input
                          placeholder="Optional description"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Qty
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Discount
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount || ""}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "discount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">Line Total: </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(getLineTotal(item))}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Additional notes (optional)"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Tax ({form.taxPercent}%)
                  </span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(total)}
                  </span>
                </div>

                {/* Payment Capture */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Amount Paid
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={total}
                      value={form.paidAmount || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          paidAmount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Payment Method
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.value} value={pm.value}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <span
                      className={`text-sm font-semibold ${
                        form.paidAmount >= total
                          ? "text-green-600"
                          : form.paidAmount > 0
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {form.paidAmount >= total
                        ? "Paid"
                        : form.paidAmount > 0
                          ? "Partially Paid"
                          : "Unpaid"}
                    </span>
                  </div>
                  {form.paidAmount > total && (
                    <p className="text-xs text-red-500">
                      Payment cannot exceed the total.
                    </p>
                  )}
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Save size={16} />
                    {submitting ? "Creating..." : "Create Invoice"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPrintPreview(true)}
                  >
                    <Printer size={16} />
                    Print Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Print Preview Modal */}
        {showPrintPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Print Preview</h2>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <FileText size={40} className="mx-auto text-blue-600 mb-2" />
                  <h1 className="text-2xl font-bold">INVOICE</h1>
                </div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-sm text-gray-500">Bill To:</p>
                    <p className="font-semibold">
                      {form.patientName || "No patient selected"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Date:</p>
                    <p>{form.invoiceDate}</p>
                  </div>
                </div>
                {form.description && (
                  <p className="text-sm text-gray-600 mb-4">{form.description}</p>
                )}
                <table className="w-full mb-6 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 border">
                        Service
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600 border">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 border">
                        Price
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 border">
                        Disc
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 border">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems
                      .filter((item) => item.serviceName)
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 border text-sm">
                            {item.serviceName}
                          </td>
                          <td className="px-4 py-2 border text-sm text-center">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 border text-sm text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-2 border text-sm text-right">
                            {formatCurrency(item.discount)}
                          </td>
                          <td className="px-4 py-2 border text-sm text-right font-medium">
                            {formatCurrency(getLineTotal(item))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Tax ({form.taxPercent}%):
                      </span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
                {form.notes && (
                  <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Notes:</p>
                    <p className="text-sm">{form.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {created && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Invoice Created
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Invoice <span className="font-mono font-medium text-blue-600">{created.invoiceNumber}</span>{" "}
                was saved successfully.
              </p>
              <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">{formatCurrency(created.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(created.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance</span>
                  <span className="font-medium text-red-600">{formatCurrency(created.balance)}</span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/billing/invoices/${created.id}`)}
                >
                  View Invoice
                </Button>
                <Button
                  onClick={() => router.push(`/billing/invoices/${created.id}?print=1`)}
                >
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/billing/invoices/${created.id}?print=1`)
                  }
                >
                  Print Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreated(null);
                    setForm((prev) => ({
                      ...prev,
                      description: "",
                      taxPercent: 0,
                      notes: "",
                      paidAmount: 0,
                      paymentMethod: "CASH",
                    }));
                    setLineItems([
                      {
                        id: "1",
                        serviceName: "",
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        discount: 0,
                      },
                    ]);
                  }}
                >
                  Create New Bill
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
