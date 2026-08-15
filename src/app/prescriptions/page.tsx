"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Eye,
  Printer,
  MessageCircle,
  Pill,
  User,
  Calendar,
} from "lucide-react";

interface Prescription {
  id: string;
  prescriptionNumber: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
  prescriptionDate: string;
  diagnosis: string | null;
  items: { id: string }[];
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/prescriptions");
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data.prescriptions || []);
      } else {
        setPrescriptions([]);
      }
    } catch {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return prescriptions;
    const q = search.toLowerCase();
    return prescriptions.filter(
      (p) =>
        (p.patient?.name || "").toLowerCase().includes(q) ||
        p.prescriptionNumber.toLowerCase().includes(q) ||
        (p.diagnosis || "").toLowerCase().includes(q)
    );
  }, [prescriptions, search]);

  function handlePrint(id: string) {
    window.open(`/prescriptions/${id}?print=true`, "_blank");
  }

  function handleWhatsApp(rx: Prescription) {
    const text = encodeURIComponent(
      `Prescription ${rx.prescriptionNumber} for ${rx.patient?.name}\nDiagnosis: ${rx.diagnosis || "N/A"}\nMedicines: ${rx.items?.length || 0} items\n\nView at: ${window.location.origin}/prescriptions/${rx.id}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage and view patient prescriptions
            </p>
          </div>
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            New Prescription
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by patient, Rx# or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading prescriptions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Pill size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No prescriptions found</p>
            <p className="text-gray-400 text-sm mt-1">
              {prescriptions.length === 0
                ? "Create your first prescription to get started"
                : "Try a different search term"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rx#
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Diagnosis
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Medicines
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                   {filtered.map((rx) => (
                    <tr key={rx.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-semibold text-blue-600">
                          {rx.prescriptionNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {rx.patient?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{rx.doctor?.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {new Date(rx.prescriptionDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 line-clamp-1">
                          {rx.diagnosis || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {rx.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/prescriptions/${rx.id}`}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handlePrint(rx.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(rx)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                            title="Send via WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
