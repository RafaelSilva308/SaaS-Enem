"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home, Calendar, BookOpen, Target, PenTool,
  BarChart2, Trophy, Sparkles, Bell, Settings,
  ShieldCheck, Search, ChevronRight, X, Crown,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useGamificationStore } from "@/stores/gamification-store"

interface NavGroup {
  label: string
  items: {
    href: string
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
    label: string
    badge?: number
    dot?: boolean
    premium?: boolean
    admin?: boolean
  }[]
}

const groups: NavGroup[] = [
  {
    label: "Estudo",
    items: [
      { href: "/dashboard",      icon: Home,      label: "Dashboard" },
      { href: "/plano",          icon: Calendar,  label: "Plano de Estudos" },
      { href: "/banco-questoes", icon: BookOpen,  label: "Banco de Questões" },
      { href: "/simulados",      icon: Target,    label: "Simulados" },
      { href: "/redacao",        icon: PenTool,   label: "Redação" },
    ],
  },
  {
    label: "Progresso",
    items: [
      { href: "/desempenho",          icon: BarChart2,  label: "Desempenho" },
      { href: "/gamificacao",         icon: Trophy,     label: "Gamificação" },
      { href: "/analise-comparativa", icon: Sparkles,   label: "Análise IA", premium: true },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/notificacoes",  icon: Bell,       label: "Notificações", dot: true },
      { href: "/configuracoes", icon: Settings,   label: "Configurações" },
      { href: "/admin/dashboard",   icon: ShieldCheck, label: "Admin", admin: true },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
  unreadCount?: number
}

export function Sidebar({ open, onClose, unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const { streak } = useGamificationStore()

  const initials = user?.name
    ? user.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()
    : "EP"

  const handleLogout = () => {
    clearAuth()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar fixed lg:relative z-30 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">EP</div>
          <div className="col" style={{ lineHeight: 1.1, minWidth: 0 }}>
            <div className="text-gradient-brand" style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>ENEM Pro</div>
            <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>v1.0 · 2026</div>
          </div>
          <button onClick={onClose} className="lg:hidden btn btn-icon ml-auto" style={{ height: 28, width: 28 }}>
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="row between" style={{ padding: "10px 12px", marginTop: 4, marginBottom: 8, gap: 8, background: "rgba(15,23,42,0.5)", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer" }}>
          <div className="row" style={{ gap: 8, color: "var(--muted-foreground)" }}>
            <Search size={14} />
            <span style={{ fontSize: 12.5 }}>Buscar tudo…</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </div>
        </div>

        {/* Nav groups */}
        <div style={{ overflowY: "auto", flex: 1, marginRight: -8, paddingRight: 8 }}>
          {groups.map((g) => (
            <div key={g.label}>
              <div className="sidebar-section-label">{g.label}</div>
              {g.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                const hasUnread = item.dot && unreadCount > 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`sidebar-item ${active ? "sidebar-item-active" : ""}`}
                  >
                    <Icon size={17} style={{ flexShrink: 0, opacity: 0.85 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>{item.badge}</span>
                    )}
                    {hasUnread && (
                      <span style={{ width: 6, height: 6, background: "var(--destructive)", borderRadius: 999 }} />
                    )}
                    {item.premium && (
                      <Sparkles size={12} style={{ color: "var(--brand-violet-light)" }} />
                    )}
                    {item.admin && (
                      <Crown size={12} style={{ color: "var(--amber)" }} />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Streak pill */}
        {streak > 0 && (
          <div className="streak-pill" style={{ marginTop: 16 }}>
            <span style={{ fontSize: 20, animation: "flame 1.4s ease-in-out infinite", display: "inline-block" }}>🔥</span>
            <div className="col" style={{ flex: 1, lineHeight: 1.1 }}>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Streak ativo</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{streak} dias seguidos</div>
            </div>
          </div>
        )}

        {/* User */}
        <div className="sidebar-user" onClick={() => router.push("/configuracoes")}>
          <div style={{ position: "relative" }}>
            <div className="avatar" style={{ height: 32, width: 32 }}>{initials}</div>
            <span style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, background: "#10b981", borderRadius: 999, border: "2px solid #0a1226" }} />
          </div>
          <div className="col" style={{ flex: 1, lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name ?? "Usuário"}
            </div>
            <div className="row" style={{ gap: 4 }}>
              <span className="badge badge-premium" style={{ height: 16, fontSize: 9.5, padding: "0 6px", gap: 3 }}>✦ Pro</span>
            </div>
          </div>
          <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
        </div>
      </aside>
    </>
  )
}
