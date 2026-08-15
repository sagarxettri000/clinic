"use client"

import { useState, useEffect } from "react"
import {
  Building2,
  Calendar,
  DollarSign,
  Printer,
  MessageSquare,
  Save,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { SkeletonCard } from "@/components/ui/loading"
import { useToast } from "@/components/ui/toast"

type SettingsTab = "clinic" | "appointment" | "financial" | "printing" | "whatsapp"

interface SettingsData {
  [key: string]: string
}

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: "clinic", label: "Clinic Info", icon: Building2 },
  { key: "appointment", label: "Appointment", icon: Calendar },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "printing", label: "Printing", icon: Printer },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
]

export default function SettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>("clinic")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsData>({})

  useEffect(() => {
    let cancelled = false
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : { data: {} }))
      .then((data) => {
        if (!cancelled) setSettings(data.data || {})
      })
      .catch(() => {
        console.error("Failed to fetch settings")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const editableKeys = [
        "clinic_name",
        "clinic_phone",
        "clinic_email",
        "clinic_website",
        "clinic_address",
        "clinic_logo",
        "currency",
        "tax_percent",
        "revenue_share_method",
        "payment_methods",
        "appointment_numbering_mode",
        "appointment_default_duration",
        "appointment_default_status",
        "appointment_auto_confirm",
        "prescription_layout",
        "invoice_layout",
        "receipt_layout",
        "paper_size",
        "print_header",
        "print_footer",
        "whatsapp_provider",
        "whatsapp_phone_number",
        "whatsapp_api_key",
        "whatsapp_api_url",
        "whatsapp_enabled",
      ]
      const payload: Record<string, string> = {}
      for (const key of editableKeys) {
        if (settings[key] !== undefined) payload[key] = settings[key]
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast("Settings saved successfully", "success")
      } else {
        toast("Failed to save settings", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    } finally {
      setSaving(false)
    }
  }

  const renderField = (key: string, label: string, type: string = "text", options?: { value: string; label: string }[]) => {
    if (type === "select" && options) {
      return (
        <Select
          key={key}
          label={label}
          value={settings[key] || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          options={options}
        />
      )
    }
    if (type === "textarea") {
      return (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
          <textarea
            value={settings[key] || ""}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
    return (
      <Input
        key={key}
        label={label}
        type={type}
        value={settings[key] || ""}
        onChange={(e) => handleChange(key, e.target.value)}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your clinic settings</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your clinic settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "clinic" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Information</CardTitle>
            <CardDescription>Basic information about your clinic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("clinic_name", "Clinic Name")}
              {renderField("clinic_phone", "Phone Number", "tel")}
              {renderField("clinic_email", "Email", "email")}
              {renderField("clinic_website", "Website", "url")}
            </div>
            {renderField("clinic_address", "Address", "textarea")}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Logo</label>
              <div className="flex items-center gap-4">
                {settings.clinic_logo && (
                  <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={settings.clinic_logo}
                      alt="Clinic Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          handleChange("clinic_logo", reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "appointment" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Settings</CardTitle>
            <CardDescription>Configure appointment numbering and defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("appointment_numbering_mode", "Numbering Mode", "select", [
                { value: "AUTO", label: "Auto (System generated)" },
                { value: "MANUAL", label: "Manual (User entered)" },
              ])}
              {renderField("appointment_default_duration", "Default Duration (minutes)", "number")}
              {renderField("appointment_default_status", "Default Status", "select", [
                { value: "PENDING", label: "Pending" },
                { value: "CONFIRMED", label: "Confirmed" },
              ])}
              {renderField("appointment_auto_confirm", "Auto Confirm", "select", [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ])}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "financial" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Settings</CardTitle>
            <CardDescription>Configure currency, tax, and revenue share settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("currency", "Currency", "select", [
                { value: "NPR", label: "NPR - Nepalese Rupee" },
                { value: "USD", label: "USD - US Dollar" },
                { value: "INR", label: "INR - Indian Rupee" },
                { value: "GBP", label: "GBP - British Pound" },
              ])}
              {renderField("tax_percent", "Tax %", "number")}
              {renderField("revenue_share_method", "Revenue Share Calculation", "select", [
                { value: "PERCENTAGE", label: "Percentage of consultation fee" },
                { value: "FIXED", label: "Fixed amount per consultation" },
              ])}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Payment Methods
              </label>
              <div className="flex flex-wrap gap-3">
                {["CASH", "CARD", "BANK_TRANSFER", "EASYPAY", "JAZZCASH", "OTHER"].map((method) => {
                  const enabled = (settings.payment_methods || "CASH,CARD").split(",").includes(method)
                  return (
                    <label key={method} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const current = (settings.payment_methods || "CASH,CARD").split(",").filter(Boolean)
                          const updated = e.target.checked
                            ? [...current, method]
                            : current.filter((m) => m !== method)
                          handleChange("payment_methods", updated.join(","))
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {method.replace(/_/g, " ")}
                    </label>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "printing" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Printing Settings</CardTitle>
            <CardDescription>Configure prescription, invoice, and receipt layouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("prescription_layout", "Prescription Layout", "select", [
                { value: "STANDARD", label: "Standard" },
                { value: "COMPACT", label: "Compact" },
                { value: "DETAILED", label: "Detailed" },
              ])}
              {renderField("invoice_layout", "Invoice Layout", "select", [
                { value: "STANDARD", label: "Standard" },
                { value: "SIMPLE", label: "Simple" },
                { value: "PROFESSIONAL", label: "Professional" },
              ])}
              {renderField("receipt_layout", "Receipt Layout", "select", [
                { value: "STANDARD", label: "Standard" },
                { value: "THERMAL", label: "Thermal Printer" },
                { value: "A4", label: "A4 Size" },
              ])}
              {renderField("paper_size", "Paper Size", "select", [
                { value: "A4", label: "A4" },
                { value: "LETTER", label: "Letter" },
                { value: "THERMAL_58", label: "Thermal 58mm" },
                { value: "THERMAL_80", label: "Thermal 80mm" },
              ])}
            </div>
            {renderField("print_header", "Print Header", "textarea")}
            {renderField("print_footer", "Print Footer", "textarea")}
          </CardContent>
        </Card>
      )}

      {activeTab === "whatsapp" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp Settings</CardTitle>
            <CardDescription>Configure WhatsApp API provider and templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("whatsapp_provider", "API Provider", "select", [
                { value: "WHATSAPP_CLOUD", label: "WhatsApp Cloud API" },
                { value: "TWILIO", label: "Twilio" },
                { value: "MESSAGEBird", label: "MessageBird" },
                { value: "CUSTOM", label: "Custom Provider" },
              ])}
              {renderField("whatsapp_phone_number", "Phone Number", "tel")}
              {renderField("whatsapp_api_key", "API Key", "password")}
              {renderField("whatsapp_api_url", "API URL", "url")}
            </div>
            {renderField("whatsapp_enabled", "Enable WhatsApp", "select", [
              { value: "true", label: "Enabled" },
              { value: "false", label: "Disabled" },
            ])}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
