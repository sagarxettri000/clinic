"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { ModalForm } from "@/components/ui/modal-form"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { DoctorSettlement, Doctor } from "@/types"

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
]

export default function DoctorSettlementsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [settlements, setSettlements] = useState<DoctorSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [settlementForm, setSettlementForm] = useState({
    fromDate: "",
    toDate: "",
    amountPaid: "0",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  })

  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true)
      const params_obj = new URLSearchParams()
      if (fromDate) params_obj.set("fromDate", fromDate)
      if (toDate) params_obj.set("toDate", toDate)

      const [docRes, setRes] = await Promise.all([
        fetch(`/api/doctors/${id}`),
        fetch(`/api/doctors/${id}/settlements?${params_obj.toString()}`),
      ])

      if (docRes.ok) {
        const docData = await docRes.json()
        setDoctor(docData)
      }
      if (setRes.ok) {
        const setData = await setRes.json()
        setSettlements(setData.settlements || [])
      }
    } catch {
      console.error("Failed to fetch settlements")
    } finally {
      setLoading(false)
    }
  }, [id, fromDate, toDate])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  const handleSettlementChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setSettlementForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateSettlement = async () => {
    if (!settlementForm.fromDate || !settlementForm.toDate) {
      toast("From date and To date are required", "error")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/doctors/${id}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: settlementForm.fromDate,
          toDate: settlementForm.toDate,
          amountPaid: Number(settlementForm.amountPaid) || 0,
          paymentMethod: settlementForm.paymentMethod,
          referenceNumber: settlementForm.referenceNumber || null,
          notes: settlementForm.notes || null,
        }),
      })

      if (res.ok) {
        toast("Settlement created successfully", "success")
        setModalOpen(false)
        setSettlementForm({
          fromDate: "",
          toDate: "",
          amountPaid: "0",
          paymentMethod: "CASH",
          referenceNumber: "",
          notes: "",
        })
        fetchSettlements()
      } else {
        const data = await res.json()
        toast(data.error || "Failed to create settlement", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Settlements - {doctor?.name || "Doctor"}
            </h1>
            <p className="text-muted-foreground">
              Manage doctor settlement payments
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Settlement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setFromDate("")
                setToDate("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} />
          ) : settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No settlements found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a new settlement to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Consultations</TableHead>
                    <TableHead className="text-right">Gross Revenue</TableHead>
                    <TableHead className="text-right">Doctor Share</TableHead>
                    <TableHead className="text-right">Previously Paid</TableHead>
                    <TableHead className="text-right">Current Payable</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(s.fromDate)} - {formatDate(s.toDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{s.totalConsultations}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.grossRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.doctorShare)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.previouslyPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.currentPayable)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.remainingPayable)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Settlement"
        onSubmit={handleCreateSettlement}
        submitLabel={submitting ? "Creating..." : "Create Settlement"}
        isLoading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="From Date *"
              type="date"
              name="fromDate"
              value={settlementForm.fromDate}
              onChange={handleSettlementChange}
            />
            <Input
              label="To Date *"
              type="date"
              name="toDate"
              value={settlementForm.toDate}
              onChange={handleSettlementChange}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Amount Paid"
              type="number"
              min="0"
              step="0.01"
              name="amountPaid"
              value={settlementForm.amountPaid}
              onChange={handleSettlementChange}
            />
            <Select
              label="Payment Method"
              name="paymentMethod"
              value={settlementForm.paymentMethod}
              onChange={handleSettlementChange}
              options={paymentMethodOptions}
            />
          </div>
          <Input
            label="Reference Number"
            name="referenceNumber"
            value={settlementForm.referenceNumber}
            onChange={handleSettlementChange}
            placeholder="Transaction reference (optional)"
          />
          <Textarea
            label="Notes"
            name="notes"
            value={settlementForm.notes}
            onChange={handleSettlementChange}
            placeholder="Settlement notes (optional)"
            rows={3}
          />
        </div>
      </ModalForm>
    </div>
  )
}
