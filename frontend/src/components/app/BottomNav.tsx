"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, BookOpen, ClipboardList, LayoutDashboard, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Início" },
  { href: "/plano",         icon: BookOpen,         label: "Plano" },
  { href: "/simulados",     icon: ClipboardList,    label: "Simulados" },
  { href: "/redacao",       icon: PenLine,          label: "Redação" },
  { href: "/desempenho",    icon: BarChart2,        label: "Desempenho" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 lg:hidden border-t border-border bg-background/90 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 flex-1 py-2 transition-colors"
            >
              <Icon
                size={22}
                className={cn(
                  "transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
