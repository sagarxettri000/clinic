"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { ToastProvider } from "@/components/ui/toast"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/patients/new": "Add Patient",
  "/appointments": "Appointments",
  "/appointments/calendar": "Appointment Calendar",
  "/appointments/new": "New Appointment",
  "/doctors": "Doctors",
  "/doctors/new": "Add Doctor",
  "/doctors/settlements": "Doctor Settlements",
  "/emr": "Electronic Medical Records",
  "/prescriptions": "Prescriptions",
  "/pharmacy": "Pharmacy Inventory",
  "/billing/invoices": "Invoices",
  "/billing/payments": "Payments",
  "/billing/refunds": "Refunds",
  "/accounts": "Cash Book",
  "/accounts/income": "Income",
  "/accounts/expenses": "Expenses",
  "/accounts/expenses/new": "Create Expense",
  "/accounts/ledger": "Ledger",
  "/reports": "Reports",
  "/reports/patients": "Patient Report",
  "/reports/invoices": "Invoice Report",
  "/reports/payments": "Payment Report",
  "/reports/refunds": "Refund Report",
  "/reports/doctor-payments": "Doctor Payment Report",
  "/whatsapp": "WhatsApp",
  "/users": "Users",
  "/users/roles": "Roles",
  "/settings": "Settings",
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login")
    }
  }, [user, loading, router, pathname])

  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (pathname === "/login" || !user) return <>{children}</>

  const title = pageTitles[pathname] || "Clinic Management System"

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </ToastProvider>
    </AuthProvider>
  )
}
