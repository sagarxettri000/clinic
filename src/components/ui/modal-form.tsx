"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Dialog } from "./dialog"
import { Button } from "./button"

interface ModalFormProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSubmit: () => void
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

export function ModalForm({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  size = "md",
}: ModalFormProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size={size}>
      <div className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-2">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
