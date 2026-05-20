"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, clearAuth } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  // Evitar hydration mismatch — Zustand persiste em localStorage
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // Verificar onboarding apenas fora da própria página
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
          // Outros erros (502, timeout): deixa o usuário na página atual
        })
    }
  }, [mounted, isAuthenticated, pathname, clearAuth, router])

  if (!mounted) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  return <>{children}</>
}
