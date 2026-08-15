"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCheck,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"

interface WhatsAppMessage {
  id: string
  phoneNumber: string
  messageType: string
  templateName: string | null
  content: string
  status: string
  createdAt: string
}

const messageTypeOptions = [
  { value: "APPOINTMENT_CONFIRMATION", label: "Appointment Confirmation" },
  { value: "PAYMENT_RECEIPT", label: "Payment Receipt" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "REMINDER", label: "Reminder" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "GENERAL", label: "General" },
]

const quickSendActions = [
  { type: "APPOINTMENT_CONFIRMATION", label: "Appointment Confirmation", icon: CheckCircle, color: "text-blue-600 bg-blue-100" },
  { type: "PAYMENT_RECEIPT", label: "Payment Receipt", icon: CheckCheck, color: "text-emerald-600 bg-emerald-100" },
  { type: "PRESCRIPTION", label: "Prescription", icon: MessageSquare, color: "text-violet-600 bg-violet-100" },
]

const statusIconMap: Record<string, React.ReactNode> = {
  QUEUED: <Clock className="h-3.5 w-3.5 text-gray-500" />,
  SENT: <Send className="h-3.5 w-3.5 text-blue-500" />,
  DELIVERED: <CheckCheck className="h-3.5 w-3.5 text-green-500" />,
  FAILED: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
}

export default function WhatsAppPage() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)

  const [phone, setPhone] = useState("")
  const [messageType, setMessageType] = useState("")
  const [content, setContent] = useState("")
  const [clinicName, setClinicName] = useState("")

  const [templates, setTemplates] = useState<Record<string, string>>({
    APPOINTMENT_CONFIRMATION: "Dear {{patient_name}}, your appointment with Dr. {{doctor_name}} is confirmed for {{date}} at {{time}}. Please arrive 10 minutes early.",
    PAYMENT_RECEIPT: "Dear {{patient_name}}, your payment of {{amount}} has been received. Invoice #{{invoice_number}}. Thank you!",
    PRESCRIPTION: "Dear {{patient_name}}, your prescription from Dr. {{doctor_name}} is ready. Please collect it from the reception.",
    REMINDER: "Dear {{patient_name}}, this is a reminder for your appointment with Dr. {{doctor_name}} on {{date}} at {{time}}.",
    FOLLOW_UP: "Dear {{patient_name}}, we hope you are feeling better. Please schedule a follow-up appointment if needed.",
    GENERAL: "Hello {{patient_name}}, this is a message from the clinic.",
  })

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/whatsapp/messages")
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      console.error("Failed to fetch messages")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.clinic_name) setClinicName(data.data.clinic_name)
      })
      .catch(() => {})
  }, [])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !content.trim()) {
      toast("Phone and content are required", "error")
      return
    }

    const digits = phone.replace(/[^\d+]/g, "")
    let waNumber = digits.replace(/^\+/, "")
    if (/^(97|98)\d{8}$/.test(waNumber)) {
      waNumber = "977" + waNumber
    }
    const today = new Date().toLocaleDateString("en-NP", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    const formalContent = `Dear Sir/Madam,

${content}

Regards,
${clinicName || "Clinic"}
${today}`
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(formalContent)}`
    window.open(url, "_blank")

    toast("Opening WhatsApp...", "success")
    setPhone("")
    setMessageType("")
    setContent("")
  }

  const handleQuickSend = (type: string) => {
    setMessageType(type)
    const template = templates[type] || ""
    setContent(template)
  }

  const handleSaveTemplates = () => {
    toast("Templates saved", "success")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Send messages and manage templates
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          <Settings className="mr-2 h-4 w-4" />
          {showTemplates ? "Hide Templates" : "Templates"}
        </Button>
      </div>

      {showTemplates && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message Templates</CardTitle>
            <CardDescription>
              Configure templates for different message types. Use variables like {"{{patient_name}}"}, {"{{doctor_name}}"}, {"{{date}}"}, {"{{time}}"}, {"{{amount}}"}, {"{{invoice_number}}"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(templates).map(([key, value]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {messageTypeOptions.find((o) => o.value === key)?.label || key}
                </label>
                <textarea
                  value={value}
                  onChange={(e) =>
                    setTemplates((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            ))}
            <Button onClick={handleSaveTemplates}>Save Templates</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Phone Number"
                    placeholder="+977 9841234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <Select
                    label="Message Type"
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    options={messageTypeOptions}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    placeholder="Type your message..."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
                <Button type="submit">
                  <Send className="mr-2 h-4 w-4" />
                  Open WhatsApp
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonTable rows={5} />
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No messages yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Send your first WhatsApp message above
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-mono text-sm">
                            {msg.phoneNumber}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">
                              {messageTypeOptions.find((o) => o.value === msg.messageType)?.label || msg.messageType}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {msg.content}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {statusIconMap[msg.status]}
                              <StatusBadge status={msg.status} />
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString("en-NP", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Send</CardTitle>
              <CardDescription>Send common message types quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickSendActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.type}
                    onClick={() => handleQuickSend(action.type)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className={`rounded-lg p-2 ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { status: "QUEUED", label: "Queued", desc: "Waiting to be sent" },
                { status: "SENT", label: "Sent", desc: "Sent to WhatsApp" },
                { status: "DELIVERED", label: "Delivered", desc: "Delivered to recipient" },
                { status: "FAILED", label: "Failed", desc: "Failed to send" },
              ].map((s) => (
                <div key={s.status} className="flex items-center gap-2">
                  {statusIconMap[s.status]}
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
