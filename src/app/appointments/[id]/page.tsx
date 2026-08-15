"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Edit,
  UserCheck,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Clock,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Skeleton, SkeletonCard } from "@/components/ui/loading"
import { ModalForm } from "@/components/ui/modal-form"
import { useToast } from "@/components/ui/toast"
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils"
import type { Appointment, AppointmentStatusHistory } from "@/types"

interface AppointmentDetail extends Appointment {
  patient: {
    id: string
    name: string
    phone: string | null
    email: string | null
    patientId: string
  }
  doctor: {
    id: string
    name: string
    specialization: string | null
    consultationFee: number
  }
  statusHistory: AppointmentStatusHistory[]
  encounters: {
    id: string
    encounterDate: Date
    chiefComplaint: string | null
  }[]
  payments: {
    id: string
    amount: number
    paymentMethod: string
    paymentDate: Date
    status: string
  }[]
}

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "EASYPAY", label: "EasyPaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "OTHER", label: "Other" },
]

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const fetchAppointment = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/${id}`)
      if (res.ok) {
        const data = await res.json()
        setAppointment(data)
      } else {
        router.push("/appointments")
      }
    } catch {
      router.push("/appointments")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchAppointment()
  }, [fetchAppointment])

  const handleStatusChange = async (
    action: "check-in" | "complete" | "cancel"
  ) => {
    const messages = {
      "check-in": "Check in this patient?",
      complete: "Mark this appointment as completed?",
      cancel: "Cancel this appointment?",
    }

    if (!window.confirm(messages[action])) return

    try {
      const res = await fetch(`/api/appointments/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "cancel" ? JSON.stringify({ reason: "Cancelled by user" }) : undefined,
      })

      if (res.ok) {
        toast(`Appointment ${action.replace("-", " ")} successful`, "success")
        fetchAppointment()
      } else {
        const data = await res.json()
        toast(data.error || `Failed to ${action}`, "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const handleReceivePayment = async () => {
    if (!appointment) return
    const amount = Number(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast("Please enter a valid amount", "error")
      return
    }

    setSubmittingPayment(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          amount,
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
        }),
      })

      if (res.ok) {
        toast("Payment recorded successfully", "success")
        setPaymentModalOpen(false)
        setPaymentForm({ amount: "", paymentMethod: "CASH", referenceNumber: "", notes: "" })
        fetchAppointment()
      } else {
        const data = await res.json()
        toast(data.error || "Failed to record payment", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setSubmittingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!appointment) return null

  const totalPaid = appointment.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const balance = appointment.consultationFee - totalPaid

  const getStatusActions = () => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; variant: "default" | "outline" | "destructive" }[] = []

    if (appointment.status === "PENDING" || appointment.status === "CONFIRMED") {
      actions.push({
        label: "Check-In",
        icon: <UserCheck className="h-4 w-4" />,
        onClick: () => handleStatusChange("check-in"),
        variant: "default",
      })
    }

    if (appointment.status === "CHECKED_IN" || appointment.status === "IN_CONSULTATION") {
      actions.push({
        label: "Complete",
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: () => handleStatusChange("complete"),
        variant: "default",
      })
    }

    if (appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED") {
      actions.push({
        label: "Cancel",
        icon: <XCircle className="h-4 w-4" />,
        onClick: () => handleStatusChange("cancel"),
        variant: "destructive",
      })
    }

    return actions
  }

  const statusActions = getStatusActions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Appointment #{appointment.appointmentNumber}
            </h1>
            <p className="text-muted-foreground">
              {formatDate(appointment.appointmentDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusActions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          ))}
          {appointment.encounters && appointment.encounters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/emr/${appointment.encounters[0]?.id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              View EMR
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <InfoItem label="Status">
                  <StatusBadge status={appointment.status} />
                </InfoItem>
                <InfoItem label="Date">{formatDate(appointment.appointmentDate)}</InfoItem>
                <InfoItem label="Time">
                  {new Date(appointment.appointmentTime).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </InfoItem>
                <InfoItem label="Duration">{appointment.duration} minutes</InfoItem>
                <InfoItem label="Consultation Fee">
                  {formatCurrency(appointment.consultationFee)}
                </InfoItem>
                <InfoItem label="Doctor Share">
                  {appointment.doctorSharePercent}%
                </InfoItem>
                {appointment.notes && (
                  <InfoItem label="Notes" className="col-span-2 md:col-span-3">
                    {appointment.notes}
                  </InfoItem>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-center gap-3 cursor-pointer hover:text-primary"
                onClick={() => router.push(`/patients/${appointment.patient?.id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {appointment.patient?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <p className="font-medium">{appointment.patient?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.patient?.patientId}
                    {appointment.patient?.phone ? ` · ${appointment.patient.phone}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-center gap-3 cursor-pointer hover:text-primary"
                onClick={() => router.push(`/doctors/${appointment.doctor?.id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {appointment.doctor?.name?.charAt(0) || "D"}
                </div>
                <div>
                  <p className="font-medium">{appointment.doctor?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.doctor?.specialization || "General"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={appointment.paymentStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Fee</span>
                <span className="font-medium">{formatCurrency(appointment.consultationFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Balance</span>
                  <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
              {balance > 0 && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setPaymentForm((prev) => ({ ...prev, amount: balance.toString() }))
                    setPaymentModalOpen(true)
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Receive Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {appointment.payments && appointment.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appointment.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.paymentMethod} · {formatDate(p.paymentDate)}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointment.statusHistory && appointment.statusHistory.length > 0 ? (
            <div className="relative ml-2 border-l-2 border-muted pl-6">
              {appointment.statusHistory.map((h, i) => (
                <div key={h.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {h.fromStatus
                          ? `${statusLabels[h.fromStatus] || h.fromStatus} → `
                          : ""}
                        {statusLabels[h.toStatus] || h.toStatus}
                      </span>
                      <StatusBadge status={h.toStatus} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)}
                    </p>
                    {h.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{h.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No status history available.</p>
          )}
        </CardContent>
      </Card>

      <ModalForm
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Receive Payment"
        onSubmit={handleReceivePayment}
        submitLabel={submittingPayment ? "Processing..." : "Record Payment"}
        isLoading={submittingPayment}
      >
        <div className="space-y-4">
          <Input
            label="Amount *"
            type="number"
            min="0.01"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
            }
          />
          <Select
            label="Payment Method *"
            value={paymentForm.paymentMethod}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
            }
            options={paymentMethodOptions}
          />
          <Input
            label="Reference Number"
            value={paymentForm.referenceNumber}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, referenceNumber: e.target.value }))
            }
            placeholder="Transaction reference (optional)"
          />
          <Input
            label="Notes"
            value={paymentForm.notes}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Payment notes (optional)"
          />
        </div>
      </ModalForm>
    </div>
  )
}

function InfoItem({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}
