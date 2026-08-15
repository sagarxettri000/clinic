"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  FileText,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Weight,
  Ruler,
  User,
  Stethoscope,
  Calendar,
  ClipboardList,
  Pill,
} from "lucide-react";

interface VitalSign {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

interface Diagnosis {
  code: string;
  description: string;
  isPrimary: boolean;
}

interface Treatment {
  description: string;
  notes: string;
}

interface PatientRef {
  id: string;
  name: string;
}

interface DoctorRef {
  id: string;
  name: string;
  specialization?: string;
}

interface Encounter {
  id: string;
  patient: PatientRef;
  doctor: DoctorRef;
  encounterDate: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  examinationFindings: string;
  clinicalNotes: string;
  vitalSigns: VitalSign[];
  diagnoses: Diagnosis[];
  treatments: Treatment[];
  followUpDate: string;
  additionalInstructions: string;
}

export default function ViewEncounterPage() {
  const params = useParams();
  const id = params.id as string;
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEncounter();
  }, [id]);

  async function fetchEncounter() {
    try {
      const res = await fetch(`/api/encounters/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEncounter(data);
      } else {
        setError("Encounter not found");
      }
    } catch {
      setError("Failed to load encounter");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading encounter...</p>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Encounter not found"}</p>
        <Link href="/emr" className="text-blue-600 hover:underline">
          Back to EMR
        </Link>
      </div>
    );
  }

  const vitals = encounter.vitalSigns?.[0];
  const primaryDx = encounter.diagnoses?.find((d) => d.isPrimary);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/emr"
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
      <h1 className="text-2xl font-bold text-gray-900">
                 Encounter Details
               </h1>
               <p className="text-gray-500 text-sm mt-1">
                 {new Date(encounter.encounterDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Printer size={16} />
              Print
            </button>
            <Link
               href={`/prescriptions/new?encounterId=${id}&patientId=${encounter.patient?.id}&doctorId=${encounter.doctor?.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Pill size={16} />
              Create Prescription
            </Link>
          </div>
        </div>

        {/* Patient & Doctor Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Patient</p>
                <p className="font-medium text-gray-900">{encounter.patient?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Stethoscope size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Doctor</p>
                <p className="font-medium text-gray-900">{encounter.doctor?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(encounter.encounterDate).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Signs */}
        {vitals && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} />
              Vital Signs
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vitals.bloodPressureSystolic != null &&
                vitals.bloodPressureDiastolic != null && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
                      <Heart size={14} />
                      Blood Pressure
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg
                    </p>
                  </div>
                )}
              {vitals.pulse != null && (
                <div className="bg-pink-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-pink-600 text-xs font-medium mb-1">
                    <Activity size={14} />
                    Pulse
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.pulse} bpm
                  </p>
                </div>
              )}
              {vitals.temperature != null && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-600 text-xs font-medium mb-1">
                    <Thermometer size={14} />
                    Temperature
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.temperature}°F
                  </p>
                </div>
              )}
              {vitals.respiratoryRate != null && (
                <div className="bg-cyan-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-cyan-600 text-xs font-medium mb-1">
                    <Wind size={14} />
                    Resp. Rate
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.respiratoryRate} /min
                  </p>
                </div>
              )}
              {vitals.spo2 != null && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-600 text-xs font-medium mb-1">SpO2</div>
                  <p className="text-lg font-bold text-gray-900">{vitals.spo2}%</p>
                </div>
              )}
              {vitals.weight != null && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1">
                    <Weight size={14} />
                    Weight
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.weight} kg
                  </p>
                </div>
              )}
              {vitals.height != null && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium mb-1">
                    <Ruler size={14} />
                    Height
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.height} cm
                  </p>
                </div>
              )}
              {vitals.bmi != null && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-purple-600 text-xs font-medium mb-1">BMI</div>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals.bmi} kg/m²
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chief Complaint */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ClipboardList size={20} />
            Chief Complaint
          </h2>
          <p className="text-gray-700">{encounter.chiefComplaint}</p>
        </div>

        {/* HPI */}
        {encounter.historyOfPresentIllness && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              History of Present Illness
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {encounter.historyOfPresentIllness}
            </p>
          </div>
        )}

        {/* Examination */}
        {encounter.examinationFindings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Examination Findings
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {encounter.examinationFindings}
            </p>
          </div>
        )}

        {/* Clinical Notes */}
        {encounter.clinicalNotes && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Clinical Notes
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {encounter.clinicalNotes}
            </p>
          </div>
        )}

        {/* Diagnoses */}
        {encounter.diagnoses?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Diagnoses
            </h2>
            <div className="space-y-2">
              {encounter.diagnoses.map((d, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    d.isPrimary ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                  }`}
                >
                  {d.isPrimary && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      PRIMARY
                    </span>
                  )}
                  {d.code && (
                    <span className="font-mono text-sm text-gray-600">{d.code}</span>
                  )}
                  <span className="text-gray-900">{d.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatments */}
        {encounter.treatments?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Treatment Plan
            </h2>
            <div className="space-y-2">
              {encounter.treatments.map((t, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 font-medium">{t.description}</p>
                  {t.notes && (
                    <p className="text-sm text-gray-500 mt-1">{t.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up & Instructions */}
        {(encounter.followUpDate || encounter.additionalInstructions) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Follow-up & Instructions
            </h2>
            {encounter.followUpDate && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Follow-up Date</p>
                <p className="text-gray-900 font-medium">
                  {new Date(encounter.followUpDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {encounter.additionalInstructions && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Additional Instructions</p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {encounter.additionalInstructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
