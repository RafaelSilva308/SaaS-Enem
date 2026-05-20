"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, BookOpen, FileQuestion, ClipboardList,
  PenLine, BarChart2, Trophy, Settings, X, GraduationCap, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  disabled?: boolean
}

const navItems: NavItem[] = [
  { href: "/app/dashboard",       icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/plano",           icon: BookOpen,        label: "Plano de Estudos" },
  { href: "/app/banco-questoes",  icon: FileQuestion,    label: "Questões" },
  { href: "/app/simulados",       icon: ClipboardList,   label: "Simulados" },
  { href: "/app/redacao",         icon: PenLine,         label: "Redação" },
  { href: "/app/desempenho",            icon: BarChart2,   label: "Desempenho" },
  { href: "/app/analise-comparativa",   icon: TrendingUp,  label: "Análise Comparativa" },
]

const bottomItems: NavItem[] = [
  { href: "/app/gamificacao",           icon: Trophy,    label: "Gamificação" },
  { href: "/app/configuracoes",          icon: Settings,  label: "Configurações" },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-30 h-full w-60 flex flex-col transition-transform duration-300",
        "border-r border-sidebar-border",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      style={{ background: "var(--sidebar)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border shrink-0">
        <Link href="/app/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg leading-none">
            ENEM<span className="text-gradient-brand">Pro</span>
          </span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, icon: Icon, label, disabled }) => {
          const active = pathname === href || (href !== "/app/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              onClick={disabled ? (e) => e.preventDefault() : onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-white",
                disabled && "opacity-40 cursor-not-allowed pointer-events-none",
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {disabled && (
                <span className="text-[10px] bg-muted/60 text-muted-foreground rounded px-1.5 py-0.5 leading-none">
                  breve
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-3 shrink-0">
        {bottomItems.map(({ href, icon: Icon, label, disabled }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              onClick={disabled ? (e) => e.preventDefault() : onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-white",
                disabled && "opacity-40 cursor-not-allowed pointer-events-none",
              )}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
