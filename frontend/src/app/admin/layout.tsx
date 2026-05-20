"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { BarChart2, BookOpen, Loader2, LogOut, Users } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin/dashboard", icon: BarChart2, label: "Dashboard" },
  { href: "/admin/users",     icon: Users,    label: "Usuários" },
  { href: "/admin/questions", icon: BookOpen, label: "Questões" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated) { router.replace("/login"); return }
    if (user?.role !== "admin") { router.replace("/app/dashboard"); return }
  }, [mounted, isAuthenticated, user, router])

  if (!mounted || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-background/60 backdrop-blur-sm">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border">
          <p className="text-sm font-bold text-primary tracking-wide">ADMIN</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">SaaS ENEM</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "gradient-blue text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { clearAuth(); router.push("/login") }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-muted/40 rounded-lg transition-colors"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
