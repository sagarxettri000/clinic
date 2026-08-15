"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { SkeletonTable } from "@/components/ui/loading"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency } from "@/lib/utils"
import type { Doctor } from "@/types"

export default function DoctorsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/doctors")
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.doctors || [])
        setTotal(data.pagination?.total || 0)
      }
    } catch {
      console.error("Failed to fetch doctors")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  const toggleStatus = async (doctor: Doctor) => {
    const next = doctor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setDoctors((prev) =>
          prev.map((d) => (d.id === doctor.id ? { ...d, status: next } : d))
        )
      } else {
        const err = await res.json().catch(() => ({}))
        console.error(err.error || "Failed to update status")
      }
    } catch {
      console.error("Network error")
    }
  }

  const columns = [
    {
      key: "profilePhoto",
      label: "Photo",
      render: (item: Doctor) => (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {item.profilePhoto ? (
            <img
              src={item.profilePhoto}
              alt={item.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            item.name?.charAt(0)?.toUpperCase() || "D"
          )}
        </div>
      ),
      className: "w-12",
    },
    {
      key: "name",
      label: "Name",
      render: (item: Doctor) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "specialization",
      label: "Specialization",
      render: (item: Doctor) => item.specialization || "-",
    },
    {
      key: "consultationFee",
      label: "Fee",
      render: (item: Doctor) => formatCurrency(item.consultationFee),
    },
    {
      key: "revenueSharePercent",
      label: "Share %",
      render: (item: Doctor) => `${item.revenueSharePercent}%`,
    },
    {
      key: "status",
      label: "Status",
      render: (item: Doctor) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <button
            onClick={() => toggleStatus(item)}
            className="rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted text-teal-600 hover:text-teal-700"
            title={
              item.status === "ACTIVE"
                ? "Deactivate this doctor"
                : "Activate this doctor"
            }
          >
            {item.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ]

  const actions = [
    {
      label: "View",
      onClick: (item: Doctor) => router.push(`/doctors/${item.id}`),
    },
    {
      label: "Edit",
      onClick: (item: Doctor) => router.push(`/doctors/${item.id}/edit`),
    },
    {
      label: "Settlements",
      onClick: (item: Doctor) => router.push(`/doctors/${item.id}/settlements`),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Doctors</h1>
            <p className="text-muted-foreground">Manage your doctors</p>
          </div>
        </div>
        <SkeletonTable rows={8} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground">{total} total doctors</p>
        </div>
        <Button onClick={() => router.push("/doctors/new")}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      {doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Stethoscope className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No doctors yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Get started by adding your first doctor.
          </p>
          <Button onClick={() => router.push("/doctors/new")} className="mt-4">
            Add Doctor
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={doctors as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search by name or specialization..."
          emptyMessage="No doctors found"
          actions={actions}
          pageSize={10}
        />
      )}
    </div>
  )
}
