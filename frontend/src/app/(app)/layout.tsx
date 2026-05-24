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
    if (pathname !== "/onboarding") {
      api.get("/diagnostic/status")
        .then(({ data }) => {
          if (!data.has_completed) router.replace("/onboarding")
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
    if (!isAuthenticated || pathname === "/onboarding") return
    try {
      const { data } = await api.get("/gamification/me")
      setGamification(data)
    } catch { /* silently ignore */ }
  }, [isAuthenticated, pathname, setGamification])

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || pathname === "/onboarding") return
    try {
      const { data } = await api.get("/notifications/unread-count")
      setUnreadCount(data.count ?? 0)
    } catch { /* silently ignore */ }
  }, [isAuthenticated, pathname])

  useEffect(() => {
    if (!mounted || !isAuthenticated || pathname === "/onboarding") return
    fetchUnreadCount()
    fetchGamification()
    gamPollRef.current = setInterval(() => {
      fetchGamification()
      fetchUnreadCount()
    }, 60_000)
    return () => { if (gamPollRef.current) clearInterval(gamPollRef.current) }
  }, [mounted, isAuthenticated, pathname, fetchGamification, fetchUnreadCount])

  useEffect(() => {
    if (!newBadges.length) return
    newBadges.forEach((b) => {
      toast(`${b.icon ?? "🏅"} Badge desbloqueado: ${b.name}`, {
        description: b.description ?? undefined,
        duration: 5000,
      })
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

  if (pathname === "/onboarding") {
    return <>{children}</>
  }

  const isFullScreen =
    pathname.includes("/simulados/") && pathname.endsWith("/fazer") ||
    pathname.includes("/redacao/escrever")

  return (
    <div className="app-shell" style={{ display: "flex" }}>
      {!isFullScreen && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          unreadCount={unreadCount}
        />
      )}

      {leveledUp && <LevelUpModal level={level} onClose={clearLevelUp} />}

      <main style={{ flex: 1, position: "relative", zIndex: 1, height: "100vh", overflow: "hidden" }}>
        {!isFullScreen && (
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            notificationCount={unreadCount}
            onUnreadChange={setUnreadCount}
          />
        )}
        <div style={isFullScreen ? { height: "100vh" } : { height: "calc(100vh - 64px)", overflowY: "auto" }}>
          {children}
        </div>
      </main>

      {!isFullScreen && (
        <>
          <BottomNav />
          <InstallPrompt />
          <PushSetup />
        </>
      )}
    </div>
  )
}
