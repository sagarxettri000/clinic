"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  permissions: { module: string; action: string }[]
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (module: string, action: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!cancelled && res.ok) {
          const d = (await res.json()) as {
            data?: Record<string, unknown>
          }
          const u = d.data ?? {}
          setUser({
            id: (u.id as string) ?? "",
            name: (u.name as string) ?? "",
            email: (u.email as string) ?? "",
            role: (u.role as string) ?? "",
            permissions:
              (u.permissions as { module: string; action: string }[]) || [],
          })
        } else {
          localStorage.removeItem("clinic-user")
          localStorage.removeItem("clinic-token")
        }
      } catch {
        localStorage.removeItem("clinic-user")
        localStorage.removeItem("clinic-token")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        })

        let data: unknown
        try {
          data = await res.json()
        } catch {
          return {
            success: false,
            error: `Server returned status ${res.status} with a non-JSON response. Try a hard refresh (Ctrl+Shift+R).`,
          }
        }

        const d = data as {
          success?: boolean
          error?: string
          data?: Record<string, unknown>
        }

        if (!res.ok || !d.success) {
          return { success: false, error: d.error || "Login failed" }
        }

        const u = d.data ?? {}
        const authUser: AuthUser = {
          id: (u.id as string) ?? "",
          name: (u.name as string) ?? "",
          email: (u.email as string) ?? "",
          role: (u.role as string) ?? "",
          permissions: (u.permissions as { module: string; action: string }[]) || [],
        }

        setUser(authUser)
        localStorage.setItem("clinic-user", JSON.stringify(authUser))
        return { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          error: `Network error: ${msg}. Make sure you're on http://localhost:3002 and try a hard refresh.`,
        }
      }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUser(null)
      localStorage.removeItem("clinic-user")
      localStorage.removeItem("clinic-token")
      router.push("/login")
    }
  }, [router])

  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (!user) return false
      if (user.role === "SUPER_ADMIN" || user.role === "Super Admin") return true
      return user.permissions.some(
        (p) => p.module === module && p.action === action
      )
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
