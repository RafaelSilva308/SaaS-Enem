"use client"

import { useEffect, useState } from "react"
import { Loader2, Lock, BookOpen, Clock, PenTool, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { useGamificationStore } from "@/stores/gamification-store"

interface HeatmapDay { date: string; hours: number; intensity: number }
interface BadgeOut { id: string; name: string; description: string | null; icon: string | null; tier: string; unlocked: boolean; unlocked_at: string | null }
interface GamData {
  points: { current_level: number; total_points: number; progress_percent: number; xp_to_next: number; xp_for_next_level: number; is_max_level: boolean }
  streak: { current_streak: number; longest_streak: number; last_studied_date: string | null; streak_broken_count: number }
  badges: BadgeOut[]; badges_count: number; heatmap: HeatmapDay[]
}
interface LeaderboardEntry { rank: number; display_name: string; level: number; total_points: number; current_streak: number }
interface LBData { weekly: LeaderboardEntry[]; all_time: LeaderboardEntry[]; user_rank_weekly: number | null; user_rank_alltime: number | null }

const LEVEL_NAMES: Record<number, string> = { 1: "Calouro", 5: "Estudante", 10: "Dedicado", 15: "Avançado", 20: "Mestre" }
function levelName(level: number) {
  const keys = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a)
  for (const k of keys) { if (level >= k) return LEVEL_NAMES[k] }
  return "Calouro"
}

const BADGE_GLOWS: Record<string, string> = { amber: "glow-amber", green: "glow-green", violet: "glow-violet", blue: "glow-blue" }
const TIER_COLORS: Record<string, string> = { bronze: "#f59e0b", silver: "#94a3b8", gold: "#fbbf24", platinum: "#a78bfa" }

const DAILY_MISSIONS = [
  { label: "Resolver 10 questões", done: 10, total: 10, xp: 30, completed: false, icon: BookOpen },
  { label: "Estudar por 1 hora", done: 0, total: 1, xp: 50, completed: false, icon: Clock },
  { label: "Enviar 1 redação", done: 0, total: 1, xp: 40, completed: false, icon: PenTool },
]

export default function GamificacaoPage() {
  const { user } = useAuthStore()
  const { setGamification } = useGamificationStore()
  const [gam, setGam] = useState<GamData | null>(null)
  const [lb, setLb] = useState<LBData | null>(null)
  const [loading, setLoading] = useState(true)
  const [badgeFilter, setBadgeFilter] = useState<"todas" | "desbloqueadas" | "bloqueadas">("todas")

  useEffect(() => {
    Promise.all([api.get("/gamification/me"), api.get("/gamification/leaderboard")])
      .then(([gRes, lRes]) => { setGam(gRes.data); setLb(lRes.data); setGamification(gRes.data) })
      .catch(() => toast.error("Erro ao carregar dados de gamificação"))
      .finally(() => setLoading(false))
  }, [setGamification])

  if (loading || !gam) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  const { points, streak, badges, heatmap } = gam
  const R = 70, C = 2 * Math.PI * R
  const pct = points.progress_percent
  const currentStreak = streak.current_streak

  const userInitials = user?.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() ?? "EP"

  const filteredBadges = badges.filter(b => {
    if (badgeFilter === "desbloqueadas") return b.unlocked
    if (badgeFilter === "bloqueadas") return !b.unlocked
    return true
  })

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Progresso → Gamificação</div>
            <h1 className="page-title">Gamificação</h1>
          </div>
        </div>

        {/* Level ring + streak */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Level */}
          <div className="card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 70% at 20% 0%, rgba(124,58,237,0.18), transparent 60%)" }} />
            <div className="row" style={{ gap: 28, position: "relative" }}>
              <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
                <svg width="180" height="180">
                  <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(30,41,59,0.7)" strokeWidth="10" />
                  <defs>
                    <linearGradient id="ring-grad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <circle cx="90" cy="90" r={R} fill="none" stroke="url(#ring-grad)" strokeWidth="10"
                    strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
                    strokeLinecap="round" transform="rotate(-90 90 90)"
                    style={{ transition: "stroke-dashoffset 1s" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  <div className="col" style={{ alignItems: "center", lineHeight: 1.1 }}>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>NÍVEL</div>
                    <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em" }} className="text-gradient-brand">{points.current_level}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{Math.round(pct)}% para nível {points.current_level + 1}</div>
                  </div>
                </div>
              </div>
              <div className="col" style={{ flex: 1, gap: 14, justifyContent: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{levelName(points.current_level)}</div>
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em" }} className="text-gradient-green">
                    {points.total_points.toLocaleString("pt-BR")}{" "}
                    <span style={{ fontSize: 16, color: "var(--muted-foreground)", fontWeight: 500 }}>XP</span>
                  </div>
                </div>
                <div>
                  <div className="row between" style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginBottom: 6 }}>
                    <span>Nível {points.current_level}</span>
                    <span className="mono">{points.xp_to_next.toLocaleString("pt-BR")} XP restantes</span>
                    <span>Nível {points.current_level + 1}</span>
                  </div>
                  <div className="progress" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg, #2563eb, #7c3aed)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="card anim-pulse-glow" style={{ padding: 24, border: "1px solid rgba(245,158,11,0.3)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, fontSize: 160, opacity: 0.08, transform: "rotate(-12deg)" }}>🔥</div>
            <div style={{ position: "relative" }}>
              <div className="row" style={{ gap: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 56, animation: "flame 1.4s ease-in-out infinite", display: "inline-block", filter: "drop-shadow(0 0 16px rgba(245,158,11,0.5))" }}>🔥</div>
                <div className="col" style={{ lineHeight: 1.1, justifyContent: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Streak ativo</div>
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em" }}>
                    {currentStreak} <span style={{ fontSize: 16, color: "var(--muted-foreground)", fontWeight: 500 }}>dias</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "#fcd34d", marginBottom: 10, fontWeight: 500 }}>
                Recorde: {streak.longest_streak} dias
              </div>
              <div className="row" style={{ gap: 4 }}>
                {Array.from({ length: Math.min(28, streak.longest_streak + 5) }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 22, borderRadius: 4, background: i < currentStreak ? "linear-gradient(180deg, #fbbf24, #d97706)" : "rgba(30,41,59,0.6)", opacity: i < currentStreak ? (0.5 + i * 0.02) : 1 }} />
                ))}
              </div>
              <div className="row between" style={{ marginTop: 16, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                <span>0 dias</span>
                <span className="mono">100 dias = Centurião 💯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily missions */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Missões diárias</h3>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Reseta à meia-noite · +120 XP no total</div>
            </div>
            <span className="badge badge-amber">0/3 concluídas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {DAILY_MISSIONS.map((m, i) => {
              const pct = (m.done / m.total) * 100
              const Icon = m.icon
              return (
                <div key={i} style={{ padding: 16, borderRadius: 14, background: m.completed ? "rgba(16,185,129,0.06)" : "rgba(15,23,42,0.4)", border: `1px solid ${m.completed ? "rgba(16,185,129,0.3)" : "var(--border)"}` }}>
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: m.completed ? "rgba(16,185,129,0.18)" : "rgba(30,41,59,0.8)", color: m.completed ? "#34d399" : "var(--muted-foreground)", display: "grid", placeItems: "center" }}>
                      <Icon size={15} />
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: 10.5 }}>+{m.xp} XP</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{m.label}</div>
                  <div className="row between" style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    <span className="mono">{m.done}/{m.total}</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="progress" style={{ height: 4 }}>
                    <div className={`progress-fill ${m.completed ? "progress-fill-green" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ranking + Badges */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
          {/* Leaderboard */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Ranking</h3>
              <button className="btn btn-ghost btn-sm">Geral <ChevronDown size={12} /></button>
            </div>
            <div className="col" style={{ gap: 4 }}>
              {(lb?.weekly ?? []).map((r, i) => {
                const medals = ["🥇", "🥈", "🥉"]
                const isYou = r.rank === (lb?.user_rank_weekly ?? -1)
                return (
                  <div key={i} className="row" style={{ gap: 12, padding: "10px 12px", background: isYou ? "rgba(37,99,235,0.1)" : "transparent", border: `1px solid ${isYou ? "rgba(37,99,235,0.35)" : "transparent"}`, borderRadius: 10 }}>
                    <div className="mono" style={{ width: 24, textAlign: "center", color: r.rank <= 3 ? "#fcd34d" : "var(--muted-foreground)", fontWeight: 700, fontSize: 13 }}>
                      {r.rank <= 3 ? medals[r.rank - 1] : r.rank}
                    </div>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {r.display_name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: isYou ? 600 : 500, color: isYou ? "#bfdbfe" : "var(--foreground)" }}>
                      {r.display_name} {isYou && <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>(você)</span>}
                    </div>
                    <div className="row" style={{ gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }} className="mono">{r.total_points.toLocaleString("pt-BR")}</span>
                      <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>XP</span>
                    </div>
                  </div>
                )
              })}
              {!lb?.weekly?.length && (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Sem dados de ranking ainda.</div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Conquistas</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{badges.filter(b => b.unlocked).length} de {badges.length} desbloqueadas</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {(["todas", "desbloqueadas", "bloqueadas"] as const).map(f => (
                  <button key={f} className={`chip ${badgeFilter === f ? "chip-active" : ""}`} onClick={() => setBadgeFilter(f)} style={{ fontSize: 11, padding: "4px 10px", textTransform: "capitalize" }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {filteredBadges.map((b, i) => {
                const tierColor = TIER_COLORS[b.tier] ?? "#94a3b8"
                const glowClass = b.unlocked ? (BADGE_GLOWS[b.tier] ?? "") : ""
                return (
                  <div key={i} className={`col center ${glowClass}`} style={{ padding: "16px 8px", borderRadius: 12, background: b.unlocked ? "rgba(15,23,42,0.6)" : "rgba(15,23,42,0.3)", border: `1px solid ${b.unlocked ? "var(--border-strong)" : "var(--border)"}`, opacity: b.unlocked ? 1 : 0.5, filter: b.unlocked ? "none" : "grayscale(0.5)", gap: 6, cursor: "pointer", position: "relative" }}>
                    <div style={{ fontSize: 28, lineHeight: 1 }}>{b.icon ?? "🏅"}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center", lineHeight: 1.2 }}>{b.description}</div>
                    {!b.unlocked && (
                      <div style={{ position: "absolute", top: 8, right: 8, color: "var(--muted-foreground)" }}>
                        <Lock size={11} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
