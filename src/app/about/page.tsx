"use client"

import { useState } from "react"
import { Activity, ExternalLink, Heart, Shield, Database, Globe, Users, Calendar, Pill, Receipt, Stethoscope, BarChart3 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function AboutPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"overview" | "tech" | "team">("overview")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">About Swasthya-Clinic</h1>
        <p className="text-sm text-gray-500">Manage Health, Care Better</p>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg shadow-teal-200">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Swasthya-Clinic</h2>
            <p className="text-sm text-gray-500">Version 1.0.0</p>
          </div>
        </div>

        <p className="mb-6 text-gray-600 leading-relaxed">
          Swasthya-Clinic is a comprehensive clinic management system designed to streamline
          healthcare operations. It helps clinics manage patients, appointments, billing,
          prescriptions, pharmacy inventory, and medical records — all in one place.
        </p>

        <div className="flex gap-2 mb-6">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "tech" as const, label: "Technology" },
            { key: "team" as const, label: "Credits" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Key Features</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Users, title: "Patient Management", desc: "Register, track, and manage patient records" },
                { icon: Calendar, title: "Appointment Scheduling", desc: "Book and manage appointments with doctors" },
                { icon: Pill, title: "Pharmacy & Inventory", desc: "Track medicines, stock, and expiry dates" },
                { icon: Receipt, title: "Billing & Invoices", desc: "Generate invoices and track payments" },
                { icon: Stethoscope, title: "EMR & Prescriptions", desc: "Digital medical records and prescriptions" },
                { icon: BarChart3, title: "Reports & Analytics", desc: "Financial and operational reports" },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 rounded-lg border p-3">
                  <feature.icon className="mt-0.5 h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "tech" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Built With</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Globe, name: "Next.js 16", desc: "React framework" },
                { icon: Shield, name: "Prisma ORM", desc: "Database ORM" },
                { icon: Database, name: "PostgreSQL", desc: "Supabase hosted" },
                { icon: Activity, name: "Tailwind CSS", desc: "UI styling" },
                { icon: Shield, name: "JWT Auth", desc: "Role-based access" },
                { icon: Globe, name: "Vercel", desc: "Deployment" },
              ].map((tech) => (
                <div key={tech.name} className="flex items-center gap-3 rounded-lg border p-3">
                  <tech.icon className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                    <p className="text-xs text-gray-500">{tech.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Credits</h3>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">
                Developed with <Heart className="inline h-4 w-4 text-red-500" /> for better healthcare management.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://github.com/sagarxettri000/clinic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Source Code
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Swasthya-Clinic. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
