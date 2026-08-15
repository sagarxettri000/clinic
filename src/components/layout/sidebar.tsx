"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Stethoscope,
  Wallet,
  Heart,
  Pill,
  Receipt,
  CreditCard,
  RotateCcw,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ScrollText,
  BarChart3,
  MessageCircle,
  Shield,
  Settings,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
  permission?: { module: string; action: string }
}

const navigation: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Patients",
    items: [
      { label: "Patient List", href: "/patients", icon: Users },
      { label: "Add Patient", href: "/patients/new", icon: UserPlus },
    ],
    permission: { module: "patients", action: "view" },
  },
  {
    title: "Appointments",
    items: [
      { label: "Calendar", href: "/appointments/calendar", icon: Calendar },
      { label: "Appointment List", href: "/appointments", icon: CalendarDays },
      { label: "New Appointment", href: "/appointments/new", icon: CalendarPlus },
      { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
    ],
    permission: { module: "appointments", action: "view" },
  },
  {
    title: "Doctors",
    items: [
      { label: "Doctor List", href: "/doctors", icon: Stethoscope },
      { label: "Add Doctor", href: "/doctors/new", icon: UserPlus },
      { label: "Doctor Settlements", href: "/doctors/settlements", icon: Wallet },
    ],
    permission: { module: "doctors", action: "view" },
  },
  {
    title: "Clinical",
    items: [
      { label: "EMR", href: "/emr", icon: Heart },
      { label: "Prescriptions", href: "/prescriptions", icon: Pill },
      { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
    ],
    permission: { module: "encounters", action: "view" },
  },
  {
    title: "Pharmacy",
    items: [
      { label: "Inventory", href: "/pharmacy", icon: Pill },
    ],
    permission: { module: "pharmacy", action: "view" },
  },
  {
    title: "Billing",
    items: [
      { label: "Invoices", href: "/billing/invoices", icon: Receipt },
      { label: "Payments", href: "/billing/payments", icon: CreditCard },
      { label: "Refunds", href: "/billing/refunds", icon: RotateCcw },
    ],
    permission: { module: "invoices", action: "view" },
  },
  {
    title: "Accounts",
    items: [
      { label: "Cash Book", href: "/accounts", icon: BookOpen },
      { label: "Income", href: "/accounts/income", icon: TrendingUp },
      { label: "Expenses", href: "/accounts/expenses", icon: TrendingDown },
      { label: "Ledger", href: "/accounts/ledger", icon: ScrollText },
    ],
    permission: { module: "accounts", action: "view" },
  },
  {
    title: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
    permission: { module: "reports", action: "view" },
  },
  {
    title: "WhatsApp",
    items: [{ label: "WhatsApp", href: "/whatsapp", icon: MessageCircle }],
    permission: { module: "whatsapp", action: "view" },
  },
  {
    title: "Users",
    items: [
      { label: "User List", href: "/users", icon: Users },
      { label: "Roles", href: "/users/roles", icon: Shield },
    ],
    permission: { module: "users", action: "view" },
  },
  {
    title: "Settings",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function NavSectionItem({
  item,
  isActive,
  onClick,
  variant,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
  variant: "single" | "sub"
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        variant === "single" ? "px-3 py-2.5" : "py-2 pl-10 pr-3",
        isActive
          ? "bg-teal-50 text-teal-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        variant === "sub" && isActive && "font-medium"
      )}
    >
      <Icon className={cn("shrink-0", variant === "single" ? "h-5 w-5" : "h-4 w-4")} />
      {item.label}
    </Link>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, hasPermission } = useAuth()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of navigation) {
      initial[section.title] = true
    }
    return initial
  })

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const filteredSections = navigation.filter((section) => {
    if (!section.permission) return true
    return hasPermission(section.permission.module, section.permission.action)
  })

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Activity className="h-7 w-7 text-teal-600" />
          <span className="text-lg font-bold text-gray-900">ClinicMS</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-1">
              {section.items.length === 1 ? (
                <NavSectionItem
                  item={section.items[0]}
                  isActive={isActive(section.items[0].href)}
                  onClick={onClose}
                  variant="single"
                />
              ) : (
                <>
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span>{section.title}</span>
                    {expandedSections[section.title] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections[section.title] && (
                    <div className="mt-0.5 space-y-0.5">
                      {section.items.map((item) => (
                        <NavSectionItem
                          key={item.href}
                          item={item}
                          isActive={isActive(item.href)}
                          onClick={onClose}
                          variant="sub"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.name || "User"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {user?.role?.replace(/_/g, " ") || "Role"}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
