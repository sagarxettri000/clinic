"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton, SkeletonCard } from "@/components/ui/loading"
import { formatDate } from "@/lib/utils"
import type {
  Encounter,
  VitalSign,
  Diagnosis,
  Treatment,
} from "@/types"

interface MedicalHistoryEntry extends Encounter {
  vitals: VitalSign[]
  diagnoses: Diagnosis[]
  treatments: Treatment[]
  doctor: { name: string; specialization: string | null }
  prescriptionSummary: { medicineName: string; dosage: string; frequency: string }[]
}

interface MedicalHistoryResponse {
  patient: { id: string; name: string; patientId: string }
  encounters: MedicalHistoryEntry[]
}

export default function MedicalHistoryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<MedicalHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/patients/${id}/medical-history`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          router.push(`/patients/${id}`)
        }
      } catch {
        router.push(`/patients/${id}`)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [id, router])

  const toggleEntry = (encounterId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(encounterId)) {
        next.delete(encounterId)
      } else {
        next.add(encounterId)
      }
      return next
    })
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

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Medical History</h1>
          <p className="text-muted-foreground">
            {data.patient.name} ({data.patient.patientId})
          </p>
        </div>
      </div>

      {data.encounters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No medical history found for this patient.
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-4 border-l-2 border-muted pl-8">
          {data.encounters.map((entry, index) => {
            const isExpanded = expandedEntries.has(entry.id)
            return (
              <div key={entry.id} className="relative mb-8 last:mb-0">
                <div className="absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />

                <Card className="cursor-pointer" onClick={() => toggleEntry(entry.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {entry.chiefComplaint || "Consultation"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Dr. {entry.doctor?.name}
                            {entry.doctor?.specialization &&
                              ` (${entry.doctor.specialization})`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatDate(entry.encounterDate)}
                        </p>
                        {entry.appointmentId && (
                          <p className="text-xs text-muted-foreground">
                            Visit #{entry.appointmentId.slice(0, 8)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4 border-t pt-4">
                      {entry.vitals?.[0] && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Vitals</h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.vitals[0].bloodPressureSystolic != null && (
                              <VitalBadge
                                label="BP"
                                value={`${entry.vitals[0].bloodPressureSystolic}/${entry.vitals[0].bloodPressureDiastolic} mmHg`}
                              />
                            )}
                            {entry.vitals[0].pulse != null && (
                              <VitalBadge label="Pulse" value={`${entry.vitals[0].pulse} bpm`} />
                            )}
                            {entry.vitals[0].temperature != null && (
                              <VitalBadge label="Temp" value={`${entry.vitals[0].temperature}°C`} />
                            )}
                            {entry.vitals[0].respiratoryRate != null && (
                              <VitalBadge label="RR" value={`${entry.vitals[0].respiratoryRate}/min`} />
                            )}
                            {entry.vitals[0].spo2 != null && (
                              <VitalBadge label="SpO2" value={`${entry.vitals[0].spo2}%`} />
                            )}
                            {entry.vitals[0].weight != null && (
                              <VitalBadge label="Weight" value={`${entry.vitals[0].weight} kg`} />
                            )}
                            {entry.vitals[0].height != null && (
                              <VitalBadge label="Height" value={`${entry.vitals[0].height} cm`} />
                            )}
                            {entry.vitals[0].bmi != null && (
                              <VitalBadge label="BMI" value={entry.vitals[0].bmi.toString()} />
                            )}
                          </div>
                        </div>
                      )}

                      {entry.chiefComplaint && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Chief Complaint</h4>
                          <p className="text-sm text-muted-foreground">{entry.chiefComplaint}</p>
                        </div>
                      )}

                      {entry.historyOfPresentIllness && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">History of Present Illness</h4>
                          <p className="text-sm text-muted-foreground">
                            {entry.historyOfPresentIllness}
                          </p>
                        </div>
                      )}

                      {entry.examinationFindings && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Examination Findings</h4>
                          <p className="text-sm text-muted-foreground">
                            {entry.examinationFindings}
                          </p>
                        </div>
                      )}

                      {entry.clinicalNotes && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Clinical Notes</h4>
                          <p className="text-sm text-muted-foreground">{entry.clinicalNotes}</p>
                        </div>
                      )}

                      {entry.diagnoses?.length > 0 && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Diagnoses</h4>
                          <ul className="space-y-1">
                            {entry.diagnoses.map((d) => (
                              <li key={d.id} className="text-sm text-muted-foreground">
                                {d.isPrimary ? "● " : "○ "}
                                {d.code && <span className="font-mono">({d.code}) </span>}
                                {d.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.treatments?.length > 0 && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Treatments</h4>
                          <ul className="space-y-1">
                            {entry.treatments.map((t) => (
                              <li key={t.id} className="text-sm text-muted-foreground">
                                - {t.description}
                                {t.notes && (
                                  <span className="ml-1 text-xs">({t.notes})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.prescriptionSummary?.length > 0 && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Prescription</h4>
                          <ul className="space-y-1">
                            {entry.prescriptionSummary.map((rx, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {rx.medicineName} - {rx.dosage} ({rx.frequency})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.additionalInstructions && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Instructions</h4>
                          <p className="text-sm text-muted-foreground">
                            {entry.additionalInstructions}
                          </p>
                        </div>
                      )}

                      {entry.followUpDate && (
                        <div>
                          <h4 className="mb-1 text-sm font-medium">Follow-up</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(entry.followUpDate)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VitalBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
