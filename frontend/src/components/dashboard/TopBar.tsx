"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Menu, Bell, LogOut, CreditCard, Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { XPWidget } from "@/components/gamification/XPWidget"
import { NotificationItem } from "@/components/notifications/NotificationItem"

interface NotifData {
  id: string
  type: string | null
  title: string | null
  message: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  created_at: string
}

interface Props {
  onMenuClick: () => void
  notificationCount?: number
  onUnreadChange?: (count: number) => void
}

export function TopBar({ onMenuClick, notificationCount = 0, onUnreadChange }: Props) {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifData[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    clearAuth()
    router.push("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const fetchNotifs = useCallback(async () => {
    setLoadingNotifs(true)
    try {
      const { data } = await api.get("/notifications", { params: { per_page: 5 } })
      setNotifs(data.items ?? [])
    } catch { /* ignore */ } finally {
      setLoadingNotifs(false)
    }
  }, [])

  const toggleBell = () => {
    const next = !bellOpen
    setBellOpen(next)
    if (next) fetchNotifs()
  }

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      onUnreadChange?.(Math.max(0, notificationCount - 1))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all")
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      onUnreadChange?.(0)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!bellOpen) return
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [bellOpen])

  return (
    <header className="sticky top-0 z-10 h-16 flex items-center px-4 lg:px-6 gap-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      <div className="flex-1" />

      <XPWidget />

      {/* Notifications */}
      <div ref={bellRef} className="relative">
        <Button variant="ghost" size="icon" className="relative" onClick={toggleBell}>
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold leading-none">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Button>

        {bellOpen && (
          <div className="absolute right-0 top-11 z-30 w-80 glass-strong rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notificações</span>
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Check size={12} />
                Marcar tudo como lido
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
              {loadingNotifs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : notifs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma notificação
                </p>
              ) : (
                notifs.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={markRead}
                    compact
                  />
                ))
              )}
            </div>

            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => { setBellOpen(false); router.push("/app/notificacoes") }}
                className="text-xs text-primary hover:text-primary/80 w-full text-center transition-colors"
              >
                Ver todas as notificações →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Avatar dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          className="rounded-full w-9 h-9 gradient-brand text-white text-sm font-bold p-0 shrink-0"
          onClick={() => setDropdownOpen((v) => !v)}
        >
          {initials}
        </Button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-11 z-20 glass-strong rounded-xl py-1.5 min-w-[180px] shadow-2xl border border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { router.push("/app/configuracoes/billing"); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
              >
                <CreditCard size={14} />
                Assinatura
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { handleLogout(); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-muted/40 transition-colors"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
