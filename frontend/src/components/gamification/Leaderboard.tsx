"use client"

import { useState } from "react"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
  rank: number
  display_name: string
  level: number
  total_points: number
  current_streak: number
}

interface Props {
  weekly: LeaderboardEntry[]
  allTime: LeaderboardEntry[]
  userRankWeekly: number | null
  userRankAlltime: number | null
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-lg">{RANK_MEDALS[rank]}</span>
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-muted/50 text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  )
}

function EntryRow({ entry, isUser }: { entry: LeaderboardEntry; isUser?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg",
      isUser && "bg-primary/10 border border-primary/20",
    )}>
      <RankBadge rank={entry.rank} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isUser && "text-primary")}>
          {entry.display_name}
        </p>
        <p className="text-[11px] text-muted-foreground">Nível {entry.level}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums">{entry.total_points.toLocaleString("pt-BR")}</p>
        <p className="text-[11px] text-muted-foreground">pts</p>
      </div>
    </div>
  )
}

export function Leaderboard({ weekly, allTime, userRankWeekly, userRankAlltime }: Props) {
  const [tab, setTab] = useState<"weekly" | "alltime">("alltime")
  const entries = tab === "weekly" ? weekly : allTime
  const userRank = tab === "weekly" ? userRankWeekly : userRankAlltime
  const preview = entries.slice(0, 10)

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Trophy size={15} className="text-amber-400" />
          Leaderboard
        </p>
        <div className="flex gap-1 p-1 glass-sm rounded-lg">
          {[
            { id: "alltime" as const, label: "Geral" },
            { id: "weekly"  as const, label: "7 dias" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum dado ainda. Estude e complete simulados para aparecer no ranking!
        </p>
      ) : (
        <div className="space-y-1">
          {preview.map((e) => (
            <EntryRow key={e.rank} entry={e} isUser={e.rank === userRank} />
          ))}
        </div>
      )}

      {userRank && userRank > 10 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground text-center mb-2">Sua posição</p>
          {entries.filter((e) => e.rank === userRank).map((e) => (
            <EntryRow key={e.rank} entry={e} isUser />
          ))}
        </div>
      )}
    </div>
  )
}
