"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users as UsersIcon,
  Shield,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { SkeletonTable } from "@/components/ui/loading"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import type { User, Role, Permission } from "@/types"

interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

interface UserWithRole extends User {
  role: { id: string; name: string } | null
}

type Tab = "users" | "roles"

const permissionModules = [
  "patients",
  "doctors",
  "appointments",
  "billing",
  "prescriptions",
  "emr",
  "accounts",
  "reports",
  "whatsapp",
  "users",
  "settings",
]

const permissionActions = ["view", "create", "edit", "delete"]

export default function UsersPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("users")
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [roles, setRoles] = useState<RoleWithPermissions[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userUsername, setUserUsername] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [userRoleId, setUserRoleId] = useState("")

  const [showRoleForm, setShowRoleForm] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  const [roleName, setRoleName] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    } catch {
      console.error("Failed to fetch users")
    }
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ])
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles || rolesData || [])
      }
      if (permsRes.ok) {
        const permsData = await permsRes.json()
        setPermissions(permsData.permissions || permsData || [])
      }
    } catch {
      console.error("Failed to fetch roles")
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await Promise.all([fetchUsers(), fetchRoles()])
      setLoading(false)
    }
    load()
  }, [fetchUsers, fetchRoles])

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }))

  const resetUserForm = () => {
    setUserName("")
    setUserEmail("")
    setUserUsername("")
    setUserPassword("")
    setUserRoleId("")
    setEditingUser(null)
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body: Record<string, string> = {
        name: userName,
        email: userEmail,
        username: userUsername,
        roleId: userRoleId,
      }
      if (userPassword) body.password = userPassword

      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast(editingUser ? "User updated" : "User created", "success")
        setShowUserForm(false)
        resetUserForm()
        fetchUsers()
      } else {
        const data = await res.json()
        toast(data.error || "Failed to save user", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user)
    setUserName(user.name)
    setUserEmail(user.email)
    setUserUsername(user.username)
    setUserPassword("")
    setUserRoleId(user.roleId || "")
    setShowUserForm(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      if (res.ok) {
        toast("User deleted", "success")
        fetchUsers()
      } else {
        toast("Failed to delete user", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const resetRoleForm = () => {
    setRoleName("")
    setRoleDescription("")
    setRolePermissions([])
    setEditingRole(null)
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body = {
        name: roleName,
        description: roleDescription,
        permissionIds: rolePermissions,
      }

      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles"
      const method = editingRole ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast(editingRole ? "Role updated" : "Role created", "success")
        setShowRoleForm(false)
        resetRoleForm()
        fetchRoles()
      } else {
        const data = await res.json()
        toast(data.error || "Failed to save role", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const handleEditRole = (role: RoleWithPermissions) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleDescription(role.description || "")
    setRolePermissions(role.permissions.map((p) => p.id))
    setShowRoleForm(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" })
      if (res.ok) {
        toast("Role deleted", "success")
        fetchRoles()
      } else {
        toast("Failed to delete role", "error")
      }
    } catch {
      toast("Network error. Please try again.", "error")
    }
  }

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  const togglePermission = (permId: string) => {
    setRolePermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    )
  }

  const toggleModulePermissions = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module)
    const allSelected = modulePerms.every((p) => rolePermissions.includes(p.id))
    if (allSelected) {
      setRolePermissions((prev) => prev.filter((id) => !modulePerms.find((p) => p.id === id)))
    } else {
      setRolePermissions((prev) => [
        ...prev.filter((id) => !modulePerms.find((p) => p.id === id)),
        ...modulePerms.map((p) => p.id),
      ])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users and role-based permissions
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Roles
        </button>
      </div>

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetUserForm()
                setShowUserForm(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          {showUserForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {editingUser ? "Edit User" : "Add User"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowUserForm(false); resetUserForm() }}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full Name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                    />
                    <Input
                      label="Username"
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                      required
                    />
                    <Input
                      label={editingUser ? "Password (leave blank to keep)" : "Password"}
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required={!editingUser}
                    />
                    <Select
                      label="Role"
                      value={userRoleId}
                      onChange={(e) => setUserRoleId(e.target.value)}
                      options={roleOptions}
                      placeholder="Select role"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editingUser ? "Update" : "Create"}</Button>
                    <Button variant="outline" onClick={() => { setShowUserForm(false); resetUserForm() }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <SkeletonTable rows={8} />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell>{user.role?.name || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString("en-NP")
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="rounded p-1.5 text-foreground hover:bg-muted"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetRoleForm()
                setShowRoleForm(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>

          {showRoleForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {editingRole ? "Edit Role" : "Add Role"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowRoleForm(false); resetRoleForm() }}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRoleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Role Name"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                    />
                    <Input
                      label="Description"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-medium">Permissions</h4>
                    <div className="space-y-2 rounded-md border p-4">
                      {permissionModules.map((module) => {
                        const modulePerms = permissions.filter((p) => p.module === module)
                        const selectedCount = modulePerms.filter((p) => rolePermissions.includes(p.id)).length
                        const allSelected = modulePerms.length > 0 && selectedCount === modulePerms.length
                        const isExpanded = expandedModules[module]

                        return (
                          <div key={module}>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleModule(module)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleModulePermissions(module)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <span className="text-sm font-medium capitalize">
                                {module}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({selectedCount}/{modulePerms.length})
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="ml-8 mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {modulePerms.map((perm) => (
                                  <label
                                    key={perm.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePermissions.includes(perm.id)}
                                      onChange={() => togglePermission(perm.id)}
                                      className="h-3.5 w-3.5 rounded border-gray-300"
                                    />
                                    <span className="capitalize">{perm.action}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">{editingRole ? "Update" : "Create"}</Button>
                    <Button variant="outline" onClick={() => { setShowRoleForm(false); resetRoleForm() }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <SkeletonTable rows={5} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <Card key={role.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{role.name}</h3>
                        {role.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {role.permissions.length} permission(s)
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="rounded p-1.5 text-foreground hover:bg-muted"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
