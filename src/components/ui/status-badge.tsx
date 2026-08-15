import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        yellow: "bg-yellow-100 text-yellow-800",
        blue: "bg-blue-100 text-blue-800",
        indigo: "bg-indigo-100 text-indigo-800",
        purple: "bg-purple-100 text-purple-800",
        green: "bg-green-100 text-green-800",
        red: "bg-red-100 text-red-800",
        gray: "bg-gray-100 text-gray-800",
        orange: "bg-orange-100 text-orange-800",
      },
    },
    defaultVariants: {
      variant: "gray",
    },
  }
)

type StatusVariant = VariantProps<typeof statusBadgeVariants>["variant"]

const statusColorMap: Record<string, StatusVariant> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  CHECKED_IN: "indigo",
  IN_CONSULTATION: "purple",
  COMPLETED: "green",
  CANCELLED: "red",
  NO_SHOW: "gray",
  PAID: "green",
  UNPAID: "red",
  PARTIALLY_PAID: "yellow",
  REFUNDED: "orange",
  DRAFT: "gray",
  QUEUED: "gray",
  SENT: "blue",
  DELIVERED: "green",
  FAILED: "red",
}

function getStatusVariant(status: string): StatusVariant {
  return statusColorMap[status.toUpperCase()] || "gray"
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getStatusVariant(status)

  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {formatStatus(status)}
    </span>
  )
}
