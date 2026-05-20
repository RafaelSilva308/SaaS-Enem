"use client"

import { useEffect, useState } from "react"
import { Loader2, Flame, Trophy } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useGamificationStore } from "@/stores/gamification-store"
import { ProgressRing } from "@/components/study-plan/ProgressRing"
import { StreakHeatmap } from "@/components/gamification/StreakHeatmap"
import { BadgeGrid } from "@/components/gamification/BadgeGrid"
import { Leaderboard } from "@/components/gamification/Leaderboard"

interface HeatmapDay { date: string; hours: number; intensity: number }
interface BadgeOut { id: string; name: string; description: string | null; icon: string | null; tier: string; unlocked: boolean; unlocked_at: string | null }
interface GamData {
  points: { current_level: number; total_points: number; progress_percent: number; xp_to_next: number; xp_for_next_level: number; is_max_level: boolean }
  streak: { current_streak: number; longest_streak: number; last_studied_date: string | null; streak_broken_count: number }
  badges: BadgeOut[]
  badges_count: number
  heatmap: HeatmapDay[]
}
interface LeaderboardEntry { rank: number; display_name: string; level: number; total_points: number; current_streak: number }
interface LBData { weekly: LeaderboardEntry[]; all_time: LeaderboardEntry[]; user_rank_weekly: number | null; user_rank_alltime: number | null }

const LEVEL_NAMES: Record<number, string> = {
  1: "Calouro", 5: "Estudante", 10: "Dedicado", 15: "Avançado", 20: "Mestre"
}
function levelName(level: number): string {
  const keys = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a)
  for (const k of keys) {
    if (level >= k) return LEVEL_NAMES[k]
  }
  return "Calouro"
}

function streakColor(streak: number) {
  if (streak >= 30) return "#7c3aed"
  if (streak >= 14) return "#f59e0b"
  if (streak >= 7) return "#f97316"
  return "#2563eb"
}

export default function GamificacaoPage() {
  const { setGamification } = useGamificationStore()
  const [gam, setGam]   = useState<GamData | null>(null)
  const [lb, setLb]     = useState<LBData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/gamification/me"),
      api.get("/gamification/leaderboard"),
    ])
      .then(([gRes, lRes]) => {
        setGam(gRes.data)
        setLb(lRes.data)
        setGamification(gRes.data)
      })
      .catch(() => toast.error("Erro ao carregar dados de gamificação"))
      .finally(() => setLoading(false))
  }, [setGamification])

  if (loading || !gam) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const { points, streak, badges, heatmap } = gam
  const ringColor = "#2563eb"

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy size={22} className="text-amber-400" />
          Gamificação
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sua jornada de estudos em números
        </p>
      </div>

      {/* Nível + Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nível */}
        <div className="glass rounded-2xl p-6 flex items-center gap-6">
          <ProgressRing
            percentage={points.progress_percent}
            size={100}
            strokeWidth={8}
            color={ringColor}
            label={String(points.current_level)}
            sublabel="nível"
          />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {levelName(points.current_level)}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {points.total_points.toLocaleString("pt-BR")}
              <span className="text-sm font-normal text-muted-foreground ml-1">XP</span>
            </p>
            {!points.is_max_level ? (
              <p className="text-xs text-muted-foreground mt-1">
                +{points.xp_to_next.toLocaleString("pt-BR")} XP para o nível {points.current_level + 1}
              </p>
            ) : (
              <p className="text-xs text-secondary mt-1 font-medium">Nível máximo atingido!</p>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="glass rounded-2xl p-6 flex items-center gap-6">
          <div
            className="w-[100px] h-[100px] rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${streakColor(streak.current_streak)}15`, border: `3px solid ${streakColor(streak.current_streak)}40` }}
          >
            <div className="text-center">
              <Flame size={28} style={{ color: streakColor(streak.current_streak) }} className="mx-auto" />
              <p className="text-2xl font-bold tabular-nums" style={{ color: streakColor(streak.current_streak) }}>
                {streak.current_streak}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Streak atual</p>
            <p className="text-lg font-bold">
              {streak.current_streak} dia{streak.current_streak !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Recorde: {streak.longest_streak} dias
            </p>
            {streak.streak_broken_count > 0 && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {streak.streak_broken_count} vez{streak.streak_broken_count !== 1 ? "es" : ""} interrompido
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <StreakHeatmap heatmap={heatmap} />

      {/* Badges */}
      <BadgeGrid badges={badges} />

      {/* Leaderboard */}
      {lb && (
        <Leaderboard
          weekly={lb.weekly}
          allTime={lb.all_time}
          userRankWeekly={lb.user_rank_weekly}
          userRankAlltime={lb.user_rank_alltime}
        />
      )}
    </div>
  )
}
