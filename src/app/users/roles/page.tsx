"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Users,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModalForm } from "@/components/ui/modal-form";

interface Permission {
  id: string;
  module: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  userCount: number;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/roles").then((r) => (r.ok ? r.json() : { roles: [] })),
      fetch("/api/permissions").then((r) =>
        r.ok ? r.json() : { permissions: [] }
      ),
    ])
      .then(([rolesRes, permsRes]) => {
        if (cancelled) return;
        setRoles(rolesRes.roles || []);
        setPermissions(permsRes.permissions || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    }
    return groups;
  }, [permissions]);

  function openCreate() {
    setEditingRole(null);
    setForm({ name: "", description: "", permissionIds: [] });
    setShowModal(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions.map((p) => p.id),
    });
    setShowModal(true);
  }

  function togglePermission(id: string) {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((pid) => pid !== id)
        : [...prev.permissionIds, id],
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert("Role name is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        permissionIds: form.permissionIds,
      };
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const res = await fetch(url, {
        method: editingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        const data = await res.json();
        if (editingRole) {
          setRoles((prev) =>
            prev.map((r) =>
              r.id === editingRole.id ? { ...data.data, userCount: r.userCount } : r
            )
          );
        } else {
          setRoles((prev) => [...prev, data.data]);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save role");
      }
    } catch {
      alert("Failed to save role");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete role");
      }
    } catch {
      alert("Failed to delete role");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage roles and their permissions
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Create Role
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Shield size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No roles found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Shield className="h-5 w-5 text-teal-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {role.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {role.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {role.name !== "Super Admin" && (
                        <button
                          onClick={() => openEdit(role)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Role"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {role.name !== "Super Admin" && (
                        <button
                          onClick={() => handleDelete(role)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                          title="Delete Role"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <KeyRound size={12} />
                      {role.permissions.length} permissions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {role.userCount} users
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ModalForm
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingRole ? "Edit Role" : "Create Role"}
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Saving..." : "Save Role"}
        isLoading={submitting}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Receptionist"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              placeholder="What can this role do?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Permissions
            </label>
            <div className="max-h-72 overflow-auto border border-gray-200 rounded-lg p-3 space-y-3">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {module}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {perms.map((p) => {
                      const checked = form.permissionIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(p.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {p.action.replace(/_/g, " ")}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}