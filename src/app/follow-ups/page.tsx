"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Eye, CheckCircle2, Plus, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"

interface FollowUpRow {
  id: string
  followUpNumber: string
  reason: string | null
  objective: string | null
  diagnosis: string | null
  outcome: string | null
  completedAt: string | null
  createdAt: string
  patient: { id: string; name: string; patientId: string }
  doctor: { id: string; name: string }
  encounter?: { id: string } | null
}

interface FollowUpStats {
  total: number
  completed: number
  open: number
}

interface PatientOption {
  id: string
  name: string
  patientId: string
}

function StatCard({ title, value, sub, tone }: { title: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`mt-2 text-2xl font-bold ${tone || "text-gray-900"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function FollowUpsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])
  const [stats, setStats] = useState<FollowUpStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get("status") || "ALL")
  const [search, setSearch] = useState("")
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [patientIdFilter, setPatientIdFilter] = useState(
    searchParams.get("patientId") || ""
  )

  useEffect(() => {
    fetch("/api/patients?limit=200")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPatients(data.patients || []))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const qs = patientIdFilter ? `patientId=${patientIdFilter}&` : ""
      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/follow-ups?${qs}limit=100`),
        fetch(`/api/follow-ups/stats${patientIdFilter ? `?patientId=${patientIdFilter}` : ""}`),
      ])
      if (listRes.ok) {
        const data = await listRes.json()
        setFollowUps(data.followUps || [])
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientIdFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    let result = followUps
    if (patientIdFilter) {
      result = result.filter((fu) => fu.patient.id === patientIdFilter)
    }
    if (filter === "OPEN") {
      result = result.filter((fu) => !fu.completedAt)
    } else if (filter === "COMPLETED") {
      result = result.filter((fu) => !!fu.completedAt)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (fu) =>
          fu.followUpNumber.toLowerCase().includes(q) ||
          fu.reason?.toLowerCase().includes(q) ||
          fu.doctor.name.toLowerCase().includes(q) ||
          fu.patient.name.toLowerCase().includes(q) ||
          fu.diagnosis?.toLowerCase().includes(q)
      )
    }
    return result
  }, [followUps, filter, search])

  const urlPatientId = searchParams.get("patientId")

  const matchedPatients = useMemo(() => {
    const q = patientSearch.toLowerCase()
    return patients
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [patients, patientSearch])

  const selectedPatient =
    patients.find((p) => p.id === patientIdFilter) || null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Follow-up Centre</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Records of patients who came back for a revisit
            </p>
          </div>
          <Button onClick={() => router.push(`/follow-ups/new${urlPatientId ? `?patientId=${urlPatientId}` : ""}`)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Follow-up
          </Button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Follow-ups" value={stats?.total ?? 0} tone="text-teal-600" />
          <StatCard title="Open" value={stats?.open ?? 0} />
          <StatCard title="Completed" value={stats?.completed ?? 0} sub="Revisits completed" />
        </div>

        {/* Patient filter */}
        <div className="mb-4 relative w-full sm:w-96">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Filter by patient..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {patientIdFilter && (
              <button
                onClick={() => {
                  setPatientIdFilter("")
                  setPatientSearch("")
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear patient filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {patientSearch && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
              {matchedPatients.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No patients found
                </div>
              ) : (
                matchedPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPatientIdFilter(p.id)
                      setPatientSearch("")
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-gray-400">{p.patientId}</span>
                  </button>
                ))
              )}
            </div>
          )}
          {selectedPatient && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium">{selectedPatient.name}</span>
              <span className="text-xs text-teal-600">
                ({selectedPatient.patientId})
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All" },
            { id: "OPEN", label: "Open" },
            { id: "COMPLETED", label: "Completed" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, doctor, patient, reason..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">Loading follow-ups...</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No follow-ups found.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Follow-up ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Recorded</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((fu) => (
                  <tr key={fu.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-teal-700">{fu.followUpNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${fu.patient.id}`} className="hover:text-teal-600 hover:underline">
                        {fu.patient.name}
                      </Link>
                      <p className="font-mono text-xs text-gray-400">{fu.patient.patientId}</p>
                    </td>
                    <td className="px-4 py-3">{formatDate(fu.createdAt)}</td>
                    <td className="px-4 py-3">Dr. {fu.doctor.name}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-gray-600">{fu.reason || fu.objective || "—"}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-gray-600">{fu.diagnosis || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={fu.completedAt ? "COMPLETED" : "OPEN"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/follow-ups/${fu.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {!fu.completedAt && (
                          <button onClick={() => router.push(`/follow-ups/${fu.id}?complete=1`)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Complete">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}