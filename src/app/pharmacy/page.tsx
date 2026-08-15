"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Pill,
  Plus,
  PackageMinus,
  Boxes,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { ModalForm } from "@/components/ui/modal-form"
import { DataTable } from "@/components/ui/data-table"
import { SkeletonTable } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import type { Medicine } from "@/types"

const CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antipyretic",
  "Antihistamine",
  "Antacid",
  "Antidiabetic",
  "Antihypertensive",
  "Antifungal",
  "Antiviral",
  "Cough & Cold",
  "Vitamins & Supplements",
  "Dermatological",
  "Ophthalmic",
  "Injectable",
  "Other",
]

const UNITS = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "SUSPENSION",
  "INJECTION",
  "DROPS",
  "CREAM",
  "OINTMENT",
  "GEL",
  "POWDER",
  "SPRAY",
  "INHALER",
  "VIAL",
  "OTHER",
]

interface MedicineForm {
  name: string
  genericName: string
  category: string
  brand: string
  strength: string
  unit: string
  purchasePrice: string
  sellingPrice: string
  stockQuantity: string
  reorderLevel: string
  batchNumber: string
  expiryDate: string
  supplier: string
  location: string
  notes: string
}

const emptyForm: MedicineForm = {
  name: "",
  genericName: "",
  category: "",
  brand: "",
  strength: "",
  unit: "TABLET",
  purchasePrice: "",
  sellingPrice: "",
  stockQuantity: "",
  reorderLevel: "10",
  batchNumber: "",
  expiryDate: "",
  supplier: "",
  location: "",
  notes: "",
}

export default function PharmacyPage() {
  const { hasPermission } = useAuth()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [summary, setSummary] = useState({ lowStockCount: 0, outOfStockCount: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [stockStatus, setStockStatus] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Medicine | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<MedicineForm>(emptyForm)

  const [movementTarget, setMovementTarget] = useState<Medicine | null>(null)
  const [movementType, setMovementType] = useState<"STOCK_IN" | "STOCK_OUT">("STOCK_IN")
  const [movementQty, setMovementQty] = useState("")
  const [movementNotes, setMovementNotes] = useState("")
  const [movementSubmitting, setMovementSubmitting] = useState(false)

  const canCreate = hasPermission("pharmacy", "create")
  const canEdit = hasPermission("pharmacy", "edit")
  const canDelete = hasPermission("pharmacy", "delete")

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: "1", limit: "100" })
      if (search) params.set("search", search)
      if (category) params.set("category", category)
      if (stockStatus) params.set("stockStatus", stockStatus)

      const res = await fetch(`/api/medicines?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMedicines(data.medicines || [])
        setSummary(data.summary || { lowStockCount: 0, outOfStockCount: 0 })
      }
    } catch {
      console.error("Failed to fetch medicines")
    } finally {
      setLoading(false)
    }
  }, [search, category, stockStatus])

  useEffect(() => {
    fetchMedicines()
  }, [fetchMedicines])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(m: Medicine) {
    setEditing(m)
    setForm({
      name: m.name,
      genericName: m.genericName || "",
      category: m.category || "",
      brand: m.brand || "",
      strength: m.strength || "",
      unit: m.unit,
      purchasePrice: String(m.purchasePrice || ""),
      sellingPrice: String(m.sellingPrice || ""),
      stockQuantity: String(m.stockQuantity),
      reorderLevel: String(m.reorderLevel),
      batchNumber: m.batchNumber || "",
      expiryDate: m.expiryDate ? String(m.expiryDate).slice(0, 10) : "",
      supplier: m.supplier || "",
      location: m.location || "",
      notes: m.notes || "",
    })
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert("Medicine name is required")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        genericName: form.genericName || null,
        category: form.category || null,
        brand: form.brand || null,
        strength: form.strength || null,
        unit: form.unit || "TABLET",
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : 0,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : 0,
        stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : 0,
        reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : 10,
        batchNumber: form.batchNumber || null,
        expiryDate: form.expiryDate || null,
        supplier: form.supplier || null,
        location: form.location || null,
        notes: form.notes || null,
      }
      const url = editing ? `/api/medicines/${editing.id}` : "/api/medicines"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowModal(false)
        fetchMedicines()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to save medicine")
      }
    } catch {
      alert("Failed to save medicine")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(m: Medicine) {
    if (!confirm(`Deactivate "${m.name}"?`)) return
    try {
      const res = await fetch(`/api/medicines/${m.id}`, { method: "DELETE" })
      if (res.ok) {
        fetchMedicines()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to deactivate medicine")
      }
    } catch {
      alert("Failed to deactivate medicine")
    }
  }

  function openMovement(m: Medicine, type: "STOCK_IN" | "STOCK_OUT") {
    setMovementTarget(m)
    setMovementType(type)
    setMovementQty("")
    setMovementNotes("")
  }

  async function handleMovement() {
    if (!movementTarget) return
    const qty = parseInt(movementQty)
    if (!qty || qty <= 0) {
      alert("Enter a valid positive quantity")
      return
    }
    if (movementType === "STOCK_OUT" && qty > movementTarget.stockQuantity) {
      alert(`Only ${movementTarget.stockQuantity} units available in stock`)
      return
    }
    setMovementSubmitting(true)
    try {
      const res = await fetch(`/api/medicines/${movementTarget.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          quantity: qty,
          notes: movementNotes || null,
        }),
      })
      if (res.ok) {
        setMovementTarget(null)
        fetchMedicines()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to adjust stock")
      }
    } catch {
      alert("Failed to adjust stock")
    } finally {
      setMovementSubmitting(false)
    }
  }

  const columns = [
    {
      key: "name",
      label: "Medicine",
      render: (m: Medicine) => (
        <div>
          <p className="font-medium">{m.name}</p>
          {m.genericName && (
            <p className="text-xs text-gray-500">{m.genericName}</p>
          )}
        </div>
      ),
    },
    {
      key: "strength",
      label: "Strength",
      render: (m: Medicine) => m.strength || "-",
    },
    {
      key: "category",
      label: "Category",
      render: (m: Medicine) => m.category || "-",
    },
    {
      key: "stockQuantity",
      label: "In Stock",
      render: (m: Medicine) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            m.stockQuantity === 0
              ? "bg-red-100 text-red-700"
              : m.stockQuantity <= m.reorderLevel
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
          )}
        >
          {m.stockQuantity === 0 ? (
            <AlertTriangle className="h-3 w-3" />
          ) : m.stockQuantity <= m.reorderLevel ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Boxes className="h-3 w-3" />
          )}
          {m.stockQuantity} {m.unit.toLowerCase()}
        </span>
      ),
    },
    {
      key: "reorderLevel",
      label: "Reorder Lvl",
      render: (m: Medicine) => m.reorderLevel,
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      render: (m: Medicine) => formatCurrency(m.sellingPrice),
    },
    {
      key: "expiryDate",
      label: "Expiry",
      render: (m: Medicine) => (m.expiryDate ? formatDate(m.expiryDate) : "-"),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (m: Medicine) => m.supplier || "-",
    },
  ]

  const actions = []
  if (canEdit) {
    actions.push(
      {
        label: "Stock In",
        onClick: (m: Medicine) => openMovement(m, "STOCK_IN"),
      },
      {
        label: "Stock Out",
        onClick: (m: Medicine) => openMovement(m, "STOCK_OUT"),
      },
      {
        label: "Edit",
        onClick: (m: Medicine) => openEdit(m),
      }
    )
  }
  if (canDelete) {
    actions.push({
      label: "Delete",
      onClick: (m: Medicine) => handleDelete(m),
      variant: "destructive" as const,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage medicine inventory and stock levels
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add Medicine
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
                <Pill className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
                <p className="text-sm text-gray-500">Medicines listed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.lowStockCount}</p>
                <p className="text-sm text-gray-500">Low stock items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                <PackageMinus className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.outOfStockCount}</p>
                <p className="text-sm text-gray-500">Out of stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, batch, or supplier..."
              />
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: "", label: "All categories" },
                  ...CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                options={[
                  { value: "", label: "All stock levels" },
                  { value: "LOW", label: "Low stock" },
                  { value: "OUT", label: "Out of stock" },
                ]}
              />
            </div>

            {loading ? (
              <SkeletonTable rows={8} />
            ) : medicines.length === 0 ? (
              <EmptyState
                icon={<Pill className="h-12 w-12" />}
                title={
                  search || category || stockStatus
                    ? "No medicines found"
                    : "No medicines yet"
                }
                description={
                  search || category || stockStatus
                    ? "Try adjusting your filters"
                    : "Add your first medicine to start tracking inventory"
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={medicines as unknown as Record<string, unknown>[]}
                searchable={false}
                actions={actions}
                pageSize={15}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ModalForm
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Medicine" : "Add Medicine"}
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Save Medicine"}
        isLoading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Medicine Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Paracetamol"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Generic Name
              </label>
              <Input
                value={form.genericName}
                onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))}
                placeholder="e.g. Acetaminophen"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Category
              </label>
              <Select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                options={[
                  { value: "", label: "Select category" },
                  ...CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Brand
              </label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Tylenol"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Strength
              </label>
              <Input
                value={form.strength}
                onChange={(e) => setForm((p) => ({ ...p, strength: e.target.value }))}
                placeholder="e.g. 500mg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unit
              </label>
              <Select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                options={UNITS.map((u) => ({ value: u, label: u.charAt(0) + u.slice(1).toLowerCase() }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Purchase Price
              </label>
              <Input
                type="number"
                min="0"
                value={form.purchasePrice}
                onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Selling Price
              </label>
              <Input
                type="number"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Initial Stock Quantity
              </label>
              <Input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(e) => setForm((p) => ({ ...p, stockQuantity: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reorder Level
              </label>
              <Input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Batch Number
              </label>
              <Input
                value={form.batchNumber}
                onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
                placeholder="e.g. B2026-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <Input
                value={form.supplier}
                onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
                placeholder="e.g. ABC Pharma"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Storage Location
              </label>
              <Input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Shelf A-1"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Additional details..."
            />
          </div>
        </div>
      </ModalForm>

      <ModalForm
        open={!!movementTarget}
        onClose={() => setMovementTarget(null)}
        title={
          movementTarget
            ? `${movementType === "STOCK_IN" ? "Stock In" : "Stock Out"} — ${movementTarget.name}`
            : "Adjust Stock"
        }
        onSubmit={handleMovement}
        submitLabel={movementSubmitting ? "Saving..." : "Save"}
        isLoading={movementSubmitting}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            Current stock: <strong>{movementTarget?.stockQuantity}</strong>{" "}
            {movementTarget?.unit.toLowerCase()}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Quantity *
            </label>
            <Input
              type="number"
              min="1"
              value={movementQty}
              onChange={(e) => setMovementQty(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <Textarea
              value={movementNotes}
              onChange={(e) => setMovementNotes(e.target.value)}
              rows={2}
              placeholder={
                movementType === "STOCK_IN"
                  ? "e.g. New purchase from supplier"
                  : "e.g. Dispensed to patient"
              }
            />
          </div>
        </div>
      </ModalForm>
    </div>
  )
}
