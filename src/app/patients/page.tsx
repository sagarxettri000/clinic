"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { SkeletonTable } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/utils"
import type { Patient } from "@/types"

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })
      if (search) params.set("search", search)

      const res = await fetch(`/api/patients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || data.data || [])
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10))
        setTotalItems(data.total || 0)
      }
    } catch {
      console.error("Failed to fetch patients")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const columns = [
    {
      key: "patientId",
      label: "Patient ID",
      render: (item: Patient) => (
        <span className="font-mono text-sm">{item.patientId}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (item: Patient) => (
        <span className="font-medium">{item.name}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (item: Patient) => item.phone || "-",
    },
    {
      key: "gender",
      label: "Gender",
      render: (item: Patient) =>
        item.gender ? item.gender.charAt(0) + item.gender.slice(1).toLowerCase() : "-",
    },
    {
      key: "dateOfBirth",
      label: "DOB",
      render: (item: Patient) =>
        item.dateOfBirth ? formatDate(item.dateOfBirth) : "-",
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (item: Patient) => formatDate(item.createdAt),
    },
    {
      key: "lastVisit",
      label: "Last Visit",
      render: (item: Patient) => {
        const patient = item as unknown as Record<string, unknown>
        return patient.lastVisit ? formatDate(patient.lastVisit as string) : "Never"
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-muted-foreground">Manage your patient records</p>
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
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            {totalItems} total patients
          </p>
        </div>
        <Button onClick={() => router.push("/patients/new")}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {patients.length === 0 && !search ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No patients yet"
          description="Get started by adding your first patient."
          action={{
            label: "Add Patient",
            onClick: () => router.push("/patients/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={patients as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search by name, phone, or ID..."
          emptyMessage={search ? `No patients found for "${search}"` : "No patients found"}
          pageSize={10}
          onRowClick={(item) => router.push(`/patients/${item.id}`)}
        />
      )}
    </div>
  )
}
