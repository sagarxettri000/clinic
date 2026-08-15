"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton, SkeletonCard } from "@/components/ui/loading"
import { useToast } from "@/components/ui/toast"

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
]

export default function EditDoctorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: "",
    specialization: "",
    phone: "",
    email: "",
    consultationFee: "",
    revenueSharePercent: "40",
    notes: "",
    status: "ACTIVE",
  })

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const res = await fetch(`/api/doctors/${id}`)
        if (res.ok) {
          const data = await res.json()
          setForm({
            name: data.name || "",
            specialization: data.specialization || "",
            phone: data.phone || "",
            email: data.email || "",
            consultationFee: data.consultationFee?.toString() || "0",
            revenueSharePercent: data.revenueSharePercent?.toString() || "40",
            notes: data.notes || "",
            status: data.status || "ACTIVE",
          })
        } else {
          router.push("/doctors")
        }
      } catch {
        router.push("/doctors")
      } finally {
        setLoading(false)
      }
    }
    fetchDoctor()
  }, [id, router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = "Name is required"
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email address"
    }
    if (form.consultationFee && isNaN(Number(form.consultationFee))) {
      newErrors.consultationFee = "Must be a valid number"
    }
    const share = Number(form.revenueSharePercent)
    if (isNaN(share) || share < 0 || share > 100) {
      newErrors.revenueSharePercent = "Must be between 0 and 100"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/doctors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          specialization: form.specialization || null,
          phone: form.phone || null,
          email: form.email || null,
          consultationFee: Number(form.consultationFee) || 0,
          revenueSharePercent: Number(form.revenueSharePercent) || 40,
          notes: form.notes || null,
          status: form.status,
        }),
      })

      if (res.ok) {
        toast("Doctor updated successfully", "success")
        router.push(`/doctors/${id}`)
      } else {
        const data = await res.json()
        if (data.details?.fieldErrors) {
          const fieldErrors: Record<string, string> = {}
          for (const [key, val] of Object.entries(data.details.fieldErrors)) {
            if (Array.isArray(val) && val.length > 0) {
              fieldErrors[key] = val[0] as string
            }
          }
          setErrors(fieldErrors)
        } else {
          toast(data.error || "Failed to update doctor", "error")
        }
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setSaving(false)
    }
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Doctor</h1>
          <p className="text-muted-foreground">Update doctor information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="name"
                label="Full Name *"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                error={errors.name}
              />
              <Input
                name="specialization"
                label="Specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="e.g. Cardiology, General"
              />
              <Input
                name="phone"
                label="Phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
              <Input
                name="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
                error={errors.email}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                name="consultationFee"
                label="Consultation Fee"
                type="number"
                min="0"
                step="0.01"
                value={form.consultationFee}
                onChange={handleChange}
                placeholder="0"
                error={errors.consultationFee}
              />
              <Input
                name="revenueSharePercent"
                label="Revenue Share %"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.revenueSharePercent}
                onChange={handleChange}
                error={errors.revenueSharePercent}
              />
              <Select
                name="status"
                label="Status"
                value={form.status}
                onChange={handleChange}
                options={statusOptions}
              />
            </div>
            <Textarea
              name="notes"
              label="Notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes about the doctor"
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/doctors/${id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
