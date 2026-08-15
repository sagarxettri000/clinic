"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Eye, Calendar, User, Stethoscope } from "lucide-react";

interface Encounter {
  id: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
  encounterDate: string;
  chiefComplaint: string;
  diagnosis: string;
}

export default function EMRListPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    fetchEncounters();
  }, []);

  async function fetchEncounters() {
    try {
      const res = await fetch("/api/encounters");
      if (res.ok) {
        const data = await res.json();
        setEncounters(data.encounters || []);
      } else {
        setEncounters([]);
      }
    } catch {
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return encounters.filter((e) => {
      const matchSearch =
        !search ||
        e.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
        e.chiefComplaint.toLowerCase().includes(search.toLowerCase()) ||
        e.diagnosis.toLowerCase().includes(search.toLowerCase());
      const matchDoctor =
        !filterDoctor ||
        e.doctor?.name.toLowerCase().includes(filterDoctor.toLowerCase());
      const encounterDate = new Date(e.encounterDate);
      const matchFrom = !filterDateFrom || encounterDate >= new Date(filterDateFrom);
      const matchTo = !filterDateTo || encounterDate <= new Date(filterDateTo);
      return matchSearch && matchDoctor && matchFrom && matchTo;
    });
  }, [encounters, search, filterDoctor, filterDateFrom, filterDateTo]);

  const doctors = useMemo(() => {
    const set = new Set(encounters.map((e) => e.doctor?.name));
    return Array.from(set).sort();
  }, [encounters]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EMR / Encounters</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage patient encounters and clinical records
            </p>
          </div>
          <Link
            href="/emr/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            New Encounter
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient, complaint, diagnosis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              placeholder="From date"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              placeholder="To date"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading encounters...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No encounters found</p>
            <p className="text-gray-400 text-sm mt-1">
              {encounters.length === 0
                ? "Create your first encounter to get started"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                    Chief Complaint
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Diagnosis
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((enc) => (
                  <tr key={enc.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {enc.patient?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{enc.doctor?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-700">
                           {new Date(enc.encounterDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 line-clamp-1">
                        {enc.chiefComplaint || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 line-clamp-1">
                        {enc.diagnosis || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/emr/${enc.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
