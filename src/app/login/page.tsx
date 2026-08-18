"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Login failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg shadow-teal-200">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Swasthya-Clinic</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage Health, Care Better
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-xl">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">
            Welcome back
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Sign in to your account to continue
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Swasthya-Clinic. All rights reserved.
        </p>
      </div>
    </div>
  )
}
