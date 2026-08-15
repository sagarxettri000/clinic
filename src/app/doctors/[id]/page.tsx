"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  CreditCard,
  Users,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton, SkeletonCard } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { Doctor, Appointment } from "@/types"

interface DoctorWithStats extends Doctor {
  _count: { appointments: number }
  settlementSummary: { totalPaid: number; pendingCount: number }
}

interface AppointmentWithPatient extends Appointment {
  patient: { id: string; name: string; phone: string | null; patientId: string }
}

export default function DoctorProfilePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [doctor, setDoctor] = useState<DoctorWithStats | null>(null)
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const toggleStatus = async () => {
    if (!doctor) return
    const next = doctor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    setUpdating(true)
    try {
      const res = await fetch(`/api/doctors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setDoctor({ ...doctor, status: next })
      } else {
        const err = await res.json().catch(() => ({}))
        console.error(err.error || "Failed to update status")
      }
    } catch {
      console.error("Network error")
    }
    setUpdating(false)
  }

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const [docRes, aptRes] = await Promise.all([
          fetch(`/api/doctors/${id}`),
          fetch(`/api/appointments?doctorId=${id}&limit=5`),
        ])
        if (docRes.ok) {
          const docData = await docRes.json()
          setDoctor(docData)
        } else {
          router.push("/doctors")
          return
        }
        if (aptRes.ok) {
          const aptData = await aptRes.json()
          setAppointments(aptData.appointments || [])
        }
      } catch {
        router.push("/doctors")
      } finally {
        setLoading(false)
      }
    }
    fetchDoctor()
  }, [id, router])

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

  if (!doctor) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {doctor.profilePhoto ? (
                <img
                  src={doctor.profilePhoto}
                  alt={doctor.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                doctor.name?.charAt(0)?.toUpperCase() || "D"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{doctor.name}</h1>
              <p className="text-muted-foreground">
                {doctor.specialization || "No specialization"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toggleStatus()}
            disabled={updating}
          >
            {doctor.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
          <Button onClick={() => router.push(`/doctors/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Appointments</p>
              <p className="text-2xl font-bold">
                {doctor._count?.appointments ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-green-100 p-2">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Settlements Paid</p>
              <p className="text-2xl font-bold">
                {formatCurrency(doctor.settlementSummary?.totalPaid ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Settlements</p>
              <p className="text-2xl font-bold">
                {doctor.settlementSummary?.pendingCount ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Phone" value={doctor.phone || "-"} />
            <InfoItem label="Email" value={doctor.email || "-"} />
            <InfoItem
              label="Consultation Fee"
              value={formatCurrency(doctor.consultationFee)}
            />
            <InfoItem
              label="Revenue Share"
              value={`${doctor.revenueSharePercent}%`}
            />
            <InfoItem
              label="Status"
              value={
                <StatusBadge status={doctor.status} />
              }
            />
            <InfoItem
              label="Registered"
              value={formatDate(doctor.createdAt)}
            />
            {doctor.notes && (
              <InfoItem
                label="Notes"
                value={doctor.notes}
                className="col-span-2 lg:col-span-3"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Appointments</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/appointments?doctorId=${id}`)}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No appointments found.
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/appointments/${apt.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      #{apt.appointmentNumber}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {apt.patient?.name || "Unknown Patient"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(apt.appointmentDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatCurrency(apt.consultationFee)}
                    </span>
                    <StatusBadge status={apt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/doctors/${id}/settlements`)}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          View Settlements
        </Button>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}
