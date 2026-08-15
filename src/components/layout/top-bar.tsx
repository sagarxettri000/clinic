"use client"

import { useState, useRef, useEffect } from "react"
import { Menu, Search, Bell, ChevronDown, LogOut, User } from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import type { Notification } from "@/types"

interface TopBarProps {
  title: string
  onMenuToggle: () => void
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const loadNotifications = () => {
    fetch("/api/notifications?limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || [])
          setUnread(data.unread || 0)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
    )
    setUnread((u) => Math.max(0, u - 1))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })))
    setUnread(0)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 sm:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-lg border bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen)
              setDropdownOpen(false)
            }}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-white py-1 shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-sm font-semibold text-gray-900">
                  Notifications
                </p>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium text-teal-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => (n.isRead === 0 ? markRead(n.id) : null)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left hover:bg-gray-50",
                        n.isRead === 0 && "bg-teal-50/60"
                      )}
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {n.title}
                      </span>
                      <span className="text-xs text-gray-600">{n.message}</span>
                      <span className="text-[11px] text-gray-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 md:block">
              {user?.name || "User"}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-white py-1 shadow-lg">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}