"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  MessageCircle,
  Pill,
} from "lucide-react";

interface Medicine {
  medicineName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: string;
  instructions: string;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  patient: { id?: string; name?: string };
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  doctor: { id?: string; name?: string };
  doctorQualification?: string;
  prescriptionDate: string;
  diagnosis: string;
  items: Medicine[];
  followUpDate: string;
  notes: string;
}

export default function ViewPrescriptionPage() {
  const params = useParams();
  const id = params.id as string;
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  async function fetchPrescription() {
    try {
      const res = await fetch(`/api/prescriptions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRx(data);
      } else {
        setError("Prescription not found");
      }
    } catch {
      setError("Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!rx) return;
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("PRESCRIPTION", pageWidth / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Rx# ${rx.prescriptionNumber}`, pageWidth / 2, y, { align: "center" });
      y += 6;
      doc.text(
        `Date: ${new Date(rx.prescriptionDate).toLocaleDateString("en-IN")}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 4;

      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Patient & Doctor
      doc.setFont("helvetica", "bold");
      doc.text("Patient:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(rx.patient?.name || "", margin + 25, y);
      if (rx.patientAge || rx.patientGender) {
        const ageGender = [
          rx.patientAge ? `Age: ${rx.patientAge}` : "",
          rx.patientGender || "",
        ]
          .filter(Boolean)
          .join(", ");
        doc.text(`(${ageGender})`, margin + 25 + doc.getTextWidth(rx.patient?.name || "") + 3, y);
      }
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Doctor:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(rx.doctor?.name || "", margin + 25, y);
      y += 8;

      // Diagnosis
      if (rx.diagnosis) {
        doc.setFont("helvetica", "bold");
        doc.text("Diagnosis:", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const diagLines = doc.splitTextToSize(rx.diagnosis, pageWidth - 2 * margin);
        doc.text(diagLines, margin, y);
        y += diagLines.length * 5 + 4;
      }

      // Medicines table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Medicines", margin, y);
      y += 8;

      if (rx.items?.length > 0) {
        // Table header
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const cols = [margin, margin + 50, margin + 80, margin + 105, margin + 130, margin + 150];
        doc.text("#", cols[0], y);
        doc.text("Medicine", cols[1], y);
        doc.text("Strength", cols[2], y);
        doc.text("Dosage/Freq", cols[3], y);
        doc.text("Duration", cols[4], y);
        doc.text("Route", cols[5], y);
        y += 2;
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        rx.items.forEach((med, idx) => {
          if (y > 260) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${idx + 1}`, cols[0], y);
          doc.text(med.medicineName || "", cols[1], y);
          doc.text(med.strength || "", cols[2], y);
          doc.text(
            `${med.dosage || ""} ${med.frequency || ""}`.trim(),
            cols[3],
            y
          );
          doc.text(med.duration || "", cols[4], y);
          doc.text(med.route || "", cols[5], y);

          if (med.instructions) {
            y += 4;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`  Note: ${med.instructions}`, margin, y);
            doc.setTextColor(0);
            doc.setFontSize(9);
          }
          y += 6;
        });
      }

      y += 4;

      // Follow-up
      if (rx.followUpDate) {
        doc.setFont("helvetica", "bold");
        doc.text("Follow-up:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(
          new Date(rx.followUpDate).toLocaleDateString("en-IN"),
          margin + 30,
          y
        );
        y += 8;
      }

      // Notes
      if (rx.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(rx.notes, pageWidth - 2 * margin);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 5;
      }

      // Signature line
      y = 260;
      doc.setLineWidth(0.3);
      doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
      doc.setFontSize(10);
      doc.text("Doctor's Signature", pageWidth - margin - 60, y + 5);

      doc.save(`Prescription-${rx.prescriptionNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF");
    }
    setGeneratingPdf(false);
  }, [rx]);

  const handleWhatsApp = useCallback(() => {
    if (!rx) return;
    let msg = `*Prescription ${rx.prescriptionNumber}*\n`;
    msg += `Date: ${new Date(rx.prescriptionDate).toLocaleDateString("en-IN")}\n`;
    msg += `Patient: ${rx.patient?.name}\n`;
    msg += `Doctor: ${rx.doctor?.name}\n\n`;
    if (rx.diagnosis) msg += `*Diagnosis:* ${rx.diagnosis}\n\n`;
    if (rx.items?.length > 0) {
      msg += `*Medicines:*\n`;
      rx.items.forEach((med, i) => {
        msg += `${i + 1}. ${med.medicineName} ${med.strength || ""} - ${med.dosage || ""} ${med.frequency} x ${med.duration || ""} (${med.route})`;
        if (med.instructions) msg += ` [${med.instructions}]`;
        msg += "\n";
      });
    }
    if (rx.followUpDate) {
      msg += `\nFollow-up: ${new Date(rx.followUpDate).toLocaleDateString("en-IN")}`;
    }
    const text = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [rx]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading prescription...</p>
      </div>
    );
  }

  if (error || !rx) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Prescription not found"}</p>
        <Link href="/prescriptions" className="text-blue-600 hover:underline">
          Back to Prescriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Controls - hidden on print */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link
              href="/prescriptions"
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Prescription {rx.prescriptionNumber}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date(rx.prescriptionDate).toLocaleDateString("en-IN", {
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
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Download size={16} />
              {generatingPdf ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Prescription content - printable */}
        <div
          ref={printRef}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none print:rounded-none"
        >
          {/* Letterhead */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              CLINIC NAME
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Clinic Address Line 1, City, State - PIN
            </p>
            <p className="text-sm text-gray-600">
              Phone: +91-XXXXXXXXXX | Email: clinic@example.com
            </p>
          </div>

          {/* Rx Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Pill size={24} className="text-blue-600" />
                PRESCRIPTION
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                 Rx# {rx.prescriptionNumber}
               </p>
             </div>
             <div className="text-right">
               <p className="text-sm text-gray-500">Date</p>
               <p className="font-medium text-gray-900">
                 {new Date(rx.prescriptionDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Patient & Doctor */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-4 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Patient
              </p>
              <p className="font-semibold text-gray-900 text-lg">
                 {rx.patient?.name}
               </p>
              {(rx.patientAge || rx.patientGender) && (
                <p className="text-sm text-gray-600">
                  {[rx.patientAge ? `${rx.patientAge} yrs` : "", rx.patientGender]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {rx.patientPhone && (
                <p className="text-sm text-gray-600">Ph: {rx.patientPhone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Prescribed By
              </p>
              <p className="font-semibold text-gray-900 text-lg">
                 Dr. {rx.doctor?.name}
               </p>
               {rx.doctorQualification && (
                <p className="text-sm text-gray-600">
                  {rx.doctorQualification}
                </p>
              )}
            </div>
          </div>

          {/* Diagnosis */}
          {rx.diagnosis && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Diagnosis
              </p>
              <p className="text-gray-900 bg-blue-50 rounded-lg px-4 py-2 border border-blue-100">
                {rx.diagnosis}
              </p>
            </div>
          )}

          {/* Medicines */}
          {rx.items?.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Medicines
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        #
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Medicine
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Strength
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Dosage
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Frequency
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Duration
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Route
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     {rx.items.map((med, idx) => (
                       <tr key={idx} className="hover:bg-gray-50">
                         <td className="px-4 py-3 text-sm text-gray-500">
                           {idx + 1}
                         </td>
                         <td className="px-4 py-3 text-sm font-medium text-gray-900">
                           {med.medicineName}
                         </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {med.strength || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {med.dosage || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {med.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {med.duration || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {med.route}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {med.quantity || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
               {/* Instructions below table */}
               {rx.items.some((m) => m.instructions) && (
                 <div className="mt-3 space-y-1">
                   {rx.items
                     .filter((m) => m.instructions)
                     .map((med, idx) => (
                       <p key={idx} className="text-xs text-gray-600">
                         <span className="font-medium">{med.medicineName}:</span>{" "}
                        {med.instructions}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Follow-up & Notes */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {rx.followUpDate && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Follow-up Date
                </p>
                <p className="text-gray-900 font-medium">
                  {new Date(rx.followUpDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {rx.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-gray-700 text-sm">{rx.notes}</p>
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="flex justify-end pt-8">
            <div className="text-center">
              <div className="w-48 border-t border-gray-400 pt-2">
                <p className="text-sm font-medium text-gray-900">
                   Dr. {rx.doctor?.name}
                 </p>
                {rx.doctorQualification && (
                  <p className="text-xs text-gray-500">
                    {rx.doctorQualification}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
