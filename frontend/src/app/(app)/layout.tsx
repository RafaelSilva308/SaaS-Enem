"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { useGamificationStore } from "@/stores/gamification-store"
import { api } from "@/lib/api"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { TopBar } from "@/components/dashboard/TopBar"
import { LevelUpModal } from "@/components/gamification/LevelUpModal"
import { BottomNav } from "@/components/app/BottomNav"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { PushSetup } from "@/components/pwa/PushSetup"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, clearAuth } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { setGamification, leveledUp, level, clearLevelUp, newBadges, clearNewBadges } = useGamificationStore()
  const gamPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    if (pathname !== "/app/onboarding") {
      api.get("/diagnostic/status")
        .then(({ data }) => {
          if (!data.has_completed) router.replace("/app/onboarding")
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            clearAuth()
            router.replace("/login")
          }
        })
    }
  }, [mounted, isAuthenticated, pathname, clearAuth, router])

  const fetchGamification = useCallback(async () => {
    if (!isAuthenticated || pathname === "/app/onboarding") return
    try {
      const { data } = await api.get("/gamification/me")
      setGamification(data)
    } catch { /* silently ignore */ }
  }, [isAuthenticated, pathname, setGamification])

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || pathname === "/app/onboarding") return
    try {
      const { data } = await api.get("/notifications/unread-count")
      setUnreadCount(data.count ?? 0)
    } catch { /* silently ignore */ }
  }, [isAuthenticated, pathname])

  // Fetch unread count + gamification on mount; poll both
  useEffect(() => {
    if (!mounted || !isAuthenticated || pathname === "/app/onboarding") return
    fetchUnreadCount()
    fetchGamification()

    gamPollRef.current = setInterval(() => {
      fetchGamification()
      fetchUnreadCount()
    }, 60_000)
    return () => { if (gamPollRef.current) clearInterval(gamPollRef.current) }
  }, [mounted, isAuthenticated, pathname, fetchGamification, fetchUnreadCount])

  // Badge toasts
  useEffect(() => {
    if (!newBadges.length) return
    newBadges.forEach((b) => {
      toast(
        `${b.icon ?? "🏅"} Badge desbloqueado: ${b.name}`,
        { description: b.description ?? undefined, duration: 5000 },
      )
    })
    clearNewBadges()
  }, [newBadges, clearNewBadges])

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  // Onboarding sem shell
  if (pathname === "/app/onboarding") {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-dvh">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Level-up modal */}
      {leveledUp && <LevelUpModal level={level} onClose={clearLevelUp} />}

      <div className="flex flex-col flex-1 min-w-0 lg:ml-60">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          notificationCount={unreadCount}
          onUnreadChange={setUnreadCount}
        />
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 overflow-auto">
          {children}
        </main>
      </div>

      <BottomNav />
      <InstallPrompt />
      <PushSetup />
    </div>
  )
}
