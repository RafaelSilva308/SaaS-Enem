"use client"

import { useGamificationStore } from "@/stores/gamification-store"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const TIER_COLORS = [
  "#94a3b8", // 1-4
  "#2563eb", // 5-9
  "#10b981", // 10-14
  "#f59e0b", // 15-19
  "#7c3aed", // 20
]

function levelColor(level: number): string {
  if (level >= 20) return TIER_COLORS[4]
  if (level >= 15) return TIER_COLORS[3]
  if (level >= 10) return TIER_COLORS[2]
  if (level >= 5)  return TIER_COLORS[1]
  return TIER_COLORS[0]
}

export function XPWidget() {
  const { level, totalPoints, progressPercent, xpToNext, streak, loaded } = useGamificationStore()

  if (!loaded) return null

  const color = levelColor(level)

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 glass-sm rounded-xl">
      {/* Level badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: color }}
        title={`Nível ${level}`}
      >
        {level}
      </div>

      {/* XP progress */}
      <div className="hidden sm:flex flex-col gap-0.5 min-w-[72px]">
        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden w-18">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%`, background: color }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {totalPoints.toLocaleString("pt-BR")} XP
        </p>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          streak >= 30 ? "text-violet-400" :
          streak >= 14 ? "text-amber-400" :
          streak >= 7  ? "text-orange-400" : "text-muted-foreground",
        )}>
          <Flame size={13} />
          <span>{streak}</span>
        </div>
      )}
    </div>
  )
}
