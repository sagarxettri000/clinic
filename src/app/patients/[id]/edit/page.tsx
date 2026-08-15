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
import type { Patient } from "@/types"

const genderOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
]

const bloodGroupOptions = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
]

export default function EditPatientPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    nationalId: "",
    emergencyContact: "",
    bloodGroup: "",
    allergies: "",
    medicalConditions: "",
    currentMedications: "",
    notes: "",
  })

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`)
        if (res.ok) {
          const data: Patient = await res.json()
          setForm({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            dateOfBirth: data.dateOfBirth
              ? new Date(data.dateOfBirth).toISOString().split("T")[0]
              : "",
            gender: data.gender || "",
            address: data.address || "",
            nationalId: data.nationalId || "",
            emergencyContact: data.emergencyContact || "",
            bloodGroup: data.bloodGroup || "",
            allergies: data.allergies || "",
            medicalConditions: data.medicalConditions || "",
            currentMedications: data.currentMedications || "",
            notes: data.notes || "",
          })
        } else {
          router.push("/patients")
        }
      } catch {
        router.push("/patients")
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
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
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          bloodGroup: form.bloodGroup || null,
          medicalConditions: form.medicalConditions || null,
          currentMedications: form.currentMedications || null,
        }),
      })

      if (res.ok) {
        toast("Patient updated successfully", "success")
        router.push(`/patients/${id}`)
      } else {
        const data = await res.json()
        if (data.errors) {
          setErrors(data.errors)
        } else {
          toast(data.error || "Failed to update patient", "error")
        }
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-7 w-48" />
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
          <h1 className="text-2xl font-bold">Edit Patient</h1>
          <p className="text-muted-foreground">Update patient information</p>
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
              <Input
                name="dateOfBirth"
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
              />
              <Select
                name="gender"
                label="Gender"
                value={form.gender}
                onChange={handleChange}
                options={genderOptions}
                placeholder="Select gender"
              />
              <Select
                name="bloodGroup"
                label="Blood Group"
                value={form.bloodGroup}
                onChange={handleChange}
                options={bloodGroupOptions}
                placeholder="Select blood group"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              name="address"
              label="Address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter full address"
              rows={3}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="nationalId"
                label="National ID / CNIC"
                value={form.nationalId}
                onChange={handleChange}
                placeholder="Enter national ID"
              />
              <Input
                name="emergencyContact"
                label="Emergency Contact"
                value={form.emergencyContact}
                onChange={handleChange}
                placeholder="Name - Phone"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              name="allergies"
              label="Known Allergies"
              value={form.allergies}
              onChange={handleChange}
              placeholder="List any known allergies"
              rows={3}
            />
            <Textarea
              name="medicalConditions"
              label="Existing Medical Conditions"
              value={form.medicalConditions}
              onChange={handleChange}
              placeholder="e.g., Hypertension, Diabetes"
              rows={3}
            />
            <Textarea
              name="currentMedications"
              label="Current Medications"
              value={form.currentMedications}
              onChange={handleChange}
              placeholder="e.g., Metformin 500mg BD"
              rows={3}
            />
            <Textarea
              name="notes"
              label="Notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes about the patient"
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/patients/${id}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
