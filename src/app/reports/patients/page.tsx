"use client"

import { useState, useEffect } from "react"
import { Users, UserCheck, UserPlus, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

const REFERENCE_TIME = Date.now()

interface PatientRow {
  id: string
  patientId: string
  name: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  bloodGroup: string | null
  status: string
  createdAt: string
}

export default function PatientReportPage() {
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/patients?limit=100&sortBy=createdAt&sortOrder=desc")
      .then((res) => (res.ok ? res.json() : { patients: [] }))
      .then((data) => {
        if (!cancelled) setPatients(data.patients || [])
      })
      .catch(() => {
        if (!cancelled) setPatients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = patients.filter((p) => {
    const d = new Date(p.createdAt).toISOString().slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  const active = filtered.filter((p) => p.status === "ACTIVE").length
  const newInRange = patients.filter((p) => {
    const d = new Date(p.createdAt).toISOString().slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }).length

  const age = (dob: string | null) => {
    if (!dob) return "-"
    const years = Math.floor((REFERENCE_TIME - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    return years >= 0 ? `${years}` : "-"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Patient Report</h1>
          <p className="text-sm text-muted-foreground">Registered patients and registration summary</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="no-print">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input label="From Date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To Date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => {
                setFrom("")
                setTo("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading report...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patients in Range</p>
                    <p className="text-2xl font-bold">{filtered.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-3">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-3">
                    <UserPlus className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Newly Registered</p>
                    <p className="text-2xl font-bold text-rose-600">{newInRange}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No patients in range</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Age</TableHead>
                        <TableHead>Blood</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.patientId}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.phone || "-"}</TableCell>
                          <TableCell>{p.gender || "-"}</TableCell>
                          <TableCell className="text-right">{age(p.dateOfBirth)}</TableCell>
                          <TableCell>{p.bloodGroup || "-"}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableCell>{formatDate(p.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}