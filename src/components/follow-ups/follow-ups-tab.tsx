"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"

interface FollowUpDoctor {
  id: string
  name: string
  specialization?: string | null
}

interface FollowUpRow {
  id: string
  followUpNumber: string
  reason: string | null
  objective: string | null
  diagnosis: string | null
  outcome: string | null
  completedAt: string | null
  createdAt: string
  doctor: FollowUpDoctor
  encounter?: { id: string; encounterDate: string } | null
}

interface FollowUpStats {
  total: number
  completed: number
  open: number
  last?: { followUpNumber: string; createdAt: string } | null
}

function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <span className="text-teal-600">{icon}</span>
        </div>
        <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function FollowUpTab({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])
  const [stats, setStats] = useState<FollowUpStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/follow-ups?patientId=${patientId}&limit=100`),
        fetch(`/api/follow-ups/stats?patientId=${patientId}`),
      ])
      if (listRes.ok) {
        const data = await listRes.json()
        setFollowUps(data.followUps || [])
      }
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    let result = followUps
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
          fu.diagnosis?.toLowerCase().includes(q)
      )
    }
    return result
  }, [followUps, filter, search])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-3 w-20 rounded bg-gray-200" />
              <div className="mt-2 h-6 w-14 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Follow-ups"
          value={stats?.total ?? 0}
          sub="Revisit records"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          title="Open"
          value={stats?.open ?? 0}
          sub="Awaiting outcome"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <StatCard
          title="Completed"
          value={stats?.completed ?? 0}
          sub="Revisits completed"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Follow-ups</h2>
        <Button
          onClick={() => router.push(`/follow-ups/new?patientId=${patientId}`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Record Follow-up
        </Button>
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "ALL", label: "All" },
          { id: "OPEN", label: "Open" },
          { id: "COMPLETED", label: "Completed" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, doctor, reason..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No follow-ups found for this patient.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Follow-up ID</th>
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
                  <td className="px-4 py-3 font-mono font-medium text-teal-700">
                    {fu.followUpNumber}
                  </td>
                  <td className="px-4 py-3">{formatDate(fu.createdAt)}</td>
                  <td className="px-4 py-3">Dr. {fu.doctor.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                    {fu.reason || fu.objective || "—"}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-gray-600">
                    {fu.diagnosis || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={fu.completedAt ? "COMPLETED" : "OPEN"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/follow-ups/${fu.id}`)}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!fu.completedAt && (
                        <button
                          onClick={() => router.push(`/follow-ups/${fu.id}?complete=1`)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Complete"
                        >
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

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/follow-ups?patientId=${patientId}`)}
        >
          <Stethoscope className="mr-2 h-4 w-4" />
          View all in Follow-up Centre
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}