"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCurrency } from "@/lib/utils"
import type { Doctor } from "@/types"
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from "date-fns"

interface CalendarAppointment {
  id: string
  appointmentNumber: number
  appointmentDate: string
  appointmentTime: string
  consultationFee: number
  status: string
  patient: { id: string; name: string }
  doctor: { id: string; name: string; specialization: string | null }
}

type ViewMode = "day" | "week" | "month"

const HOURS_START = 8
const HOURS_END = 20
const HOUR_HEIGHT = 64

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 border-yellow-300 text-yellow-800",
  CONFIRMED: "bg-blue-100 border-blue-300 text-blue-800",
  CHECKED_IN: "bg-indigo-100 border-indigo-300 text-indigo-800",
  IN_CONSULTATION: "bg-purple-100 border-purple-300 text-purple-800",
  COMPLETED: "bg-green-100 border-green-300 text-green-800",
  CANCELLED: "bg-red-100 border-red-300 text-red-800",
}

export default function CalendarPage() {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [doctorFilter, setDoctorFilter] = useState("")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Record<string, CalendarAppointment[]>>({})
  const [loading, setLoading] = useState(true)

  const doctorOptions = [
    { value: "", label: "All Doctors" },
    ...doctors.map((d) => ({ value: d.id, label: d.name })),
  ]

  const dateStr = useMemo(() => format(currentDate, "yyyy-MM-dd"), [currentDate])

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors?limit=100")
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.doctors || [])
      }
    } catch {
      console.error("Failed to fetch doctors")
    }
  }, [])

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        view,
        date: dateStr,
      })
      if (doctorFilter) params.set("doctorId", doctorFilter)

      const res = await fetch(`/api/appointments/calendar?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || {})
      }
    } catch {
      console.error("Failed to fetch calendar data")
    } finally {
      setLoading(false)
    }
  }, [view, dateStr, doctorFilter])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const navigate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      switch (view) {
        case "day":
          setCurrentDate((d) => subDays(d, 1))
          break
        case "week":
          setCurrentDate((d) => subWeeks(d, 1))
          break
        case "month":
          setCurrentDate((d) => subMonths(d, 1))
          break
      }
    } else {
      switch (view) {
        case "day":
          setCurrentDate((d) => addDays(d, 1))
          break
        case "week":
          setCurrentDate((d) => addWeeks(d, 1))
          break
        case "month":
          setCurrentDate((d) => addMonths(d, 1))
          break
      }
    }
  }

  const goToday = () => setCurrentDate(new Date())

  const getDateLabel = () => {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, dd MMMM yyyy")
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`
      }
      case "month":
        return format(currentDate, "MMMM yyyy")
    }
  }

  const hours = useMemo(() => {
    const result = []
    for (let h = HOURS_START; h <= HOURS_END; h++) {
      result.push(h)
    }
    return result
  }, [])

  const getAppointmentsForDate = (date: Date): CalendarAppointment[] => {
    const key = format(date, "yyyy-MM-dd")
    return appointments[key] || []
  }

  const getAppointmentPosition = (apt: CalendarAppointment) => {
    const time = new Date(apt.appointmentTime)
    const hours = getHours(time)
    const minutes = getMinutes(time)
    const top = ((hours - HOURS_START) * HOUR_HEIGHT) + (minutes / 60) * HOUR_HEIGHT
    const duration = 30
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 32)
    return { top, height }
  }

  const monthDays = useMemo(() => {
    if (view !== "month") return []
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [view, currentDate])

  const weekDays = useMemo(() => {
    if (view !== "week") return []
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    })
  }, [view, currentDate])

  const renderTimeGrid = (day: CalendarAppointment[], isSingleDay: boolean) => (
    <div className="relative" style={{ height: (HOURS_END - HOURS_START + 1) * HOUR_HEIGHT }}>
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border"
          style={{ top: (hour - HOURS_START) * HOUR_HEIGHT }}
        >
          <span className="absolute -top-3 left-0 text-xs text-muted-foreground">
            {format(new Date(2000, 0, 1, hour), "hh a")}
          </span>
        </div>
      ))}

      {day.map((apt) => {
        const pos = getAppointmentPosition(apt)
        const colorClass = statusColors[apt.status] || "bg-gray-100 border-gray-300"
        return (
          <div
            key={apt.id}
            className={`absolute left-1 right-1 cursor-pointer overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-xs transition-shadow hover:shadow-md ${colorClass}`}
            style={{
              top: pos.top,
              height: pos.height,
              minHeight: 28,
            }}
            onClick={() => router.push(`/appointments/${apt.id}`)}
            title={`${apt.patient?.name} - ${apt.doctor?.name} (${formatCurrency(apt.consultationFee)})`}
          >
            <p className="truncate font-medium">{apt.patient?.name}</p>
            {pos.height > 32 && (
              <p className="truncate text-[10px] opacity-75">
                {apt.doctor?.name} · {formatCurrency(apt.consultationFee)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )

  const viewOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">{getDateLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            options={viewOptions}
            className="w-28"
          />
          <Select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            options={doctorOptions}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push("/appointments/new")}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-24">
            <div className="text-center">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 animate-pulse text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading calendar...</p>
            </div>
          </CardContent>
        </Card>
      ) : view === "month" ? (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="border-r p-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const dayAppts = getAppointmentsForDate(day)
                const inMonth = day.getMonth() === currentDate.getMonth()
                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-r border-b p-1 last:border-r-0 ${
                      !inMonth ? "bg-muted/30" : ""
                    } ${isToday(day) ? "bg-primary/5" : ""}`}
                  >
                    <div
                      className={`mb-1 text-xs font-medium ${
                        isToday(day)
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80 ${
                            statusColors[apt.status] || "bg-gray-100 text-gray-700"
                          }`}
                          onClick={() => router.push(`/appointments/${apt.id}`)}
                        >
                          {format(new Date(apt.appointmentTime), "HH:mm")}{" "}
                          {apt.patient?.name}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="px-1 text-[10px] text-muted-foreground">
                          +{dayAppts.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : view === "week" ? (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
              <div className="border-r" />
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={`border-r p-2 text-center last:border-r-0 ${
                    isToday(day) ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`mt-0.5 text-sm font-medium ${
                      isToday(day)
                        ? "flex h-7 w-7 items-center justify-center mx-auto rounded-full bg-primary text-primary-foreground"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto" style={{ maxHeight: 700 }}>
              <div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-r flex items-start justify-end pr-2"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="-mt-2 text-xs text-muted-foreground">
                      {format(new Date(2000, 0, 1, hour), "hh a")}
                    </span>
                  </div>
                ))}
              </div>
              {weekDays.map((day, dayIdx) => {
                const dayAppts = getAppointmentsForDate(day)
                return (
                  <div
                    key={dayIdx}
                    className={`relative border-r last:border-r-0 ${
                      isToday(day) ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-border"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}
                    {dayAppts.map((apt) => {
                      const pos = getAppointmentPosition(apt)
                      const colorClass = statusColors[apt.status] || "bg-gray-100 border-gray-300"
                      return (
                        <div
                          key={apt.id}
                          className={`absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded border-l-2 px-1 py-0.5 text-[10px] transition-shadow hover:shadow-md ${colorClass}`}
                          style={{
                            top: pos.top,
                            height: pos.height,
                            minHeight: 24,
                          }}
                          onClick={() => router.push(`/appointments/${apt.id}`)}
                          title={`${apt.patient?.name} - ${apt.doctor?.name}`}
                        >
                          <p className="truncate font-medium">{apt.patient?.name}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[60px_1fr]">
              <div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-r flex items-start justify-end pr-2"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="-mt-2 text-xs text-muted-foreground">
                      {format(new Date(2000, 0, 1, hour), "hh a")}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                {renderTimeGrid(getAppointmentsForDate(currentDate), true)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(statusColors).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded border-l-2 ${colors}`} />
            <span className="text-muted-foreground">
              {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
