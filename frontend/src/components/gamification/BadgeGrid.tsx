"use client"

import { useState } from "react"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BadgeOut } from "@/stores/gamification-store"

interface Props {
  badges: BadgeOut[]
}

const TIER_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#94a3b8",
  gold:   "#f59e0b",
}

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold:   "Ouro",
}

type FilterTier = "all" | "bronze" | "silver" | "gold"

export function BadgeGrid({ badges }: Props) {
  const [filter, setFilter] = useState<FilterTier>("all")
  const [tooltip, setTooltip] = useState<string | null>(null)

  const unlockedCount = badges.filter((b) => b.unlocked).length
  const filtered = filter === "all" ? badges : badges.filter((b) => b.tier === filter)

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Badges — {unlockedCount}/{badges.length} desbloqueados
        </p>

        {/* Tier filter */}
        <div className="flex gap-1 p-1 glass-sm rounded-lg">
          {(["all", "bronze", "silver", "gold"] as FilterTier[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                filter === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "Todos" : TIER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3">
        {filtered.map((badge) => {
          const color = TIER_COLORS[badge.tier] ?? "#94a3b8"
          return (
            <div
              key={badge.id}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all",
                badge.unlocked
                  ? "glass hover:border-primary/20"
                  : "glass-sm opacity-40 grayscale",
              )}
              style={badge.unlocked ? { borderColor: `${color}30` } : {}}
              onMouseEnter={() => setTooltip(badge.id)}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Icon */}
              <span className="text-2xl leading-none" role="img">
                {badge.unlocked ? (badge.icon ?? "🏅") : ""}
              </span>
              {!badge.unlocked && (
                <Lock size={18} className="text-muted-foreground/50" />
              )}

              {/* Name */}
              <p className="text-[10px] text-center leading-tight line-clamp-2 w-full">
                {badge.name}
              </p>

              {/* Tier dot */}
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />

              {/* Tooltip */}
              {tooltip === badge.id && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 glass-strong rounded-xl px-3 py-2 text-xs w-48 text-center shadow-xl pointer-events-none">
                  <p className="font-medium mb-0.5">{badge.name}</p>
                  <p className="text-muted-foreground text-[11px]">{badge.description}</p>
                  {badge.unlocked && badge.unlocked_at && (
                    <p className="text-primary text-[11px] mt-1">
                      Desbloqueado em {new Date(badge.unlocked_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
