"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Flame, Zap, Target, CheckCircle2, RefreshCw, Play, ChevronRight, Sparkles, Brain } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { useGamificationStore } from "@/stores/gamification-store"
import { ContingencyBanner } from "@/components/study-plan/ContingencyBanner"
import { ContingencyModal } from "@/components/study-plan/ContingencyModal"
import { SessionTimer } from "@/components/dashboard/SessionTimer"

/* ── Types ── */
interface DashboardData {
  countdown: { days: number; hours: number; minutes: number; seconds: number; enem_date: string }
  daily_goal: { hours_goal: number; hours_completed_today: number; progress_percent: number; is_study_day: boolean }
  weekly_activity: { date: string; day_label: string; hours: number; is_today: boolean }[]
  recommendation: { topic_id: string; topic_name: string; subject: string; subject_label: string; hours_allocated: number; priority: string; type: string } | null
  recent_notifications: { id: string; type: string | null; title: string | null; message: string | null; is_read: boolean; created_at: string }[]
  user_name: string
}
interface ContingencyStatus {
  delay_detected: boolean; severity: string; days_behind: number
  hours_behind: number; delay_percent: number; health_score: number
  weakest_subject: string | null
}
interface ActiveSession { sessionId: string; startedAt: number }

/* ── Mini SVG sparkline ── */
function Sparkline({ data, color = "#60a5fa" }: { data: number[]; color?: string }) {
  const w = 120, h = 32
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2])
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`
  const gid = `spark-${color.replace("#", "")}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gid})`} />
      <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={color} />
    </svg>
  )
}

/* ── Donut ── */
function Donut({ segments, size = 160, thickness = 20, centerValue, centerLabel }: {
  segments: { value: number; color: string }[]
  size?: number; thickness?: number; centerValue?: string; centerLabel?: string
}) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(30, 41, 59, 0.6)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
          offset += len + 2
          return el
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div className="col" style={{ alignItems: "center", lineHeight: 1.1 }}>
          {centerValue && <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>{centerValue}</div>}
          {centerLabel && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{centerLabel}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── HorizontalBars ── */
function HorizontalBars({ items }: { items: { label: string; value: number; color: string; colorLight: string; hours: string }[] }) {
  const mx = Math.max(...items.map(i => i.value))
  return (
    <div className="col" style={{ gap: 14 }}>
      {items.map((it, idx) => (
        <div key={idx}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 500 }}>
              <span className="subject-dot" style={{ background: it.color }} />
              {it.label}
            </div>
            <div className="row" style={{ gap: 10, fontSize: 12 }}>
              <span className="mono" style={{ color: "var(--muted-foreground)" }}>{it.hours}</span>
              <span style={{ fontWeight: 600 }}>{it.value}%</span>
            </div>
          </div>
          <div style={{ height: 6, background: "rgba(30, 41, 59, 0.6)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(it.value / mx) * 100}%`,
              background: `linear-gradient(90deg, ${it.color}, ${it.colorLight})`,
              borderRadius: 999, boxShadow: `0 0 12px ${it.color}40`,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── StatCard ── */
function StatCard({ icon: Icon, label, value, suffix, trend, color = "blue", mini }: {
  icon: React.ComponentType<any>; label: string; value: string; suffix?: string
  trend?: number | null; color?: string; mini?: React.ReactNode
}) {
  const iconColors: Record<string, string> = { blue: "#60a5fa", green: "#34d399", violet: "#a78bfa", amber: "#fbbf24" }
  const iconBg: Record<string, string> = {
    blue: "rgba(37, 99, 235, 0.12)", green: "rgba(16, 185, 129, 0.12)",
    violet: "rgba(124, 58, 237, 0.12)", amber: "rgba(245, 158, 11, 0.12)",
  }
  return (
    <div className={`card card-hover ${color === "violet" ? "card-premium" : ""}`} style={{ padding: 20 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg[color], display: "grid", placeItems: "center", color: iconColors[color], border: `1px solid ${iconBg[color]}` }}>
          <Icon size={18} />
        </div>
        {trend != null && (
          <div className="row" style={{ gap: 4, fontSize: 11.5, color: trend > 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 600 }}>
            <span style={{ transform: trend < 0 ? "scaleY(-1)" : undefined, display: "inline-block" }}>↑</span>
            {trend > 0 ? "+" : ""}{trend}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, letterSpacing: "0.02em", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
        {suffix && <div style={{ fontSize: 14, color: "var(--muted-foreground)", fontWeight: 500 }}>{suffix}</div>}
      </div>
      {mini && <div style={{ marginTop: 14 }}>{mini}</div>}
    </div>
  )
}

/* ── Main Page ── */
export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { streak, totalPoints, level } = useGamificationStore()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [contingency, setContingency] = useState<ContingencyStatus | null>(null)
  const [contingencyModalOpen, setContingencyModalOpen] = useState(false)

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: res } = await api.get("/dashboard")
      setData(res)
    } catch {
      toast.error("Erro ao carregar o dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("active_study_session")
    if (stored) {
      try { setActiveSession(JSON.parse(stored)) } catch { /* ignore */ }
    }
    fetchDashboard()
    api.get("/contingency/status")
      .then(({ data }) => setContingency(data))
      .catch(() => { /* plano pode não existir ainda */ })
  }, [fetchDashboard])

  const handleStartSession = async (topicId?: string) => {
    if (activeSession) return
    try {
      const { data: res } = await api.post("/dashboard/study-sessions/start", {
        topic_id: topicId ?? null, session_type: "theory",
      })
      const session: ActiveSession = { sessionId: res.session_id, startedAt: Date.now() }
      setActiveSession(session)
      localStorage.setItem("active_study_session", JSON.stringify(session))
      toast.success("Sessão de estudos iniciada!")
    } catch {
      toast.error("Erro ao iniciar sessão")
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    try {
      const { data: res } = await api.post("/dashboard/study-sessions/end", {
        session_id: activeSession.sessionId,
      })
      setActiveSession(null)
      localStorage.removeItem("active_study_session")
      toast.success(`Sessão encerrada — ${res.duration_minutes}min · +${res.xp_earned} XP`)
      fetchDashboard()
    } catch {
      toast.error("Erro ao encerrar sessão")
    }
  }

  async function handleContingencyConfirm() {
    await api.post("/contingency/regenerate")
    setContingency(prev => prev ? { ...prev, delay_detected: false } : prev)
    setContingencyModalOpen(false)
    toast.success("Plano de contingência ativado!")
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  if (!data) return null

  const firstName = (user?.name ?? data.user_name).split(" ")[0]
  const now = new Date()
  const weekDay = now.toLocaleDateString("pt-BR", { weekday: "long" })
  const dayMonth = now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })

  const subjects = [
    { label: "Matemática",    value: 78, hours: "12h", color: "#2563eb", colorLight: "#60a5fa" },
    { label: "Linguagens",    value: 72, hours: "9h",  color: "#f59e0b", colorLight: "#fbbf24" },
    { label: "Ciências Nat.", value: 65, hours: "10h", color: "#10b981", colorLight: "#34d399" },
    { label: "Ciências Hum.", value: 81, hours: "7h",  color: "#ef4444", colorLight: "#f87171" },
    { label: "Redação",       value: 88, hours: "5h",  color: "#7c3aed", colorLight: "#a78bfa" },
  ]

  const donutData = [
    { label: "Mat", value: 31, color: "#2563eb" },
    { label: "Lin", value: 22, color: "#f59e0b" },
    { label: "Nat", value: 18, color: "#10b981" },
    { label: "Hum", value: 19, color: "#ef4444" },
    { label: "Red", value: 10, color: "#7c3aed" },
  ]
  const donutNames = ["Matemática", "Linguagens", "Ciências Nat.", "Ciências Hum.", "Redação"]

  const weeklyHours = data.weekly_activity.slice(-7).map(d => d.hours)

  const quickActions = [
    { icon: Brain,      label: "Questão rápida", desc: "1 questão aleatória", color: "blue",   href: "/app/banco-questoes" },
    { icon: Target,     label: "Simulado",        desc: "Áreas + tempo",       color: "green",  href: "/app/simulados" },
    { icon: CheckCircle2, label: "Redação",       desc: "Tema do dia",         color: "violet", href: "/app/redacao" },
    { icon: Sparkles,   label: "Revisão IA",      desc: "Pontos fracos",       color: "violet", href: "/app/analise-comparativa" },
  ]

  const actionColors: Record<string, { bg: string; brd: string; fg: string }> = {
    blue:   { bg: "rgba(37,99,235,0.1)",   brd: "rgba(37,99,235,0.25)",   fg: "#93c5fd" },
    green:  { bg: "rgba(16,185,129,0.1)",  brd: "rgba(16,185,129,0.25)",  fg: "#6ee7b7" },
    violet: { bg: "rgba(124,58,237,0.1)",  brd: "rgba(124,58,237,0.25)",  fg: "#c4b5fd" },
  }

  const recentAchievements = [
    { name: "Maratonista", desc: "20 dias seguidos", icon: "🔥", color: "amber" },
    { name: "Aniquilador",  desc: "100 questões certas", icon: "🎯", color: "green" },
    { name: "Redator",      desc: "Nota 940",            icon: "✍️", color: "violet" },
    { name: "Madrugador",   desc: "Estudo às 6h",        icon: "🌅", color: "amber" },
  ]
  const glowMap: Record<string, string> = { amber: "glow-amber", green: "glow-green", violet: "glow-violet" }

  const currentStreak = streak ?? 0
  const totalXP = totalPoints ?? 0
  const currentLevel = level ?? 1
  const goalPct = data.daily_goal.progress_percent

  return (
    <div className="page-scroll">
      {contingency && (
        <ContingencyModal
          open={contingencyModalOpen}
          status={contingency}
          onClose={() => setContingencyModalOpen(false)}
          onConfirm={handleContingencyConfirm}
        />
      )}

      <div className="page-inner stagger">
        {/* Contingency banner */}
        {contingency?.delay_detected && (
          <ContingencyBanner status={contingency} onFix={() => setContingencyModalOpen(true)} />
        )}

        {/* Greeting */}
        <div className="row between" style={{ marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="col">
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>☀️</span>
              <span className="badge badge-default" style={{ textTransform: "capitalize" }}>
                {weekDay} · {dayMonth}
              </span>
              {currentStreak > 0 && (
                <span className="badge badge-amber">🔥 {currentStreak} dias de streak</span>
              )}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              Bom dia, <span className="text-gradient-brand">{firstName}</span>.
            </h1>
            <div style={{ color: "var(--muted-foreground)", fontSize: 14.5, marginTop: 6 }}>
              Faltam <strong style={{ color: "var(--foreground)" }}>{data.countdown.days} dias</strong> para o ENEM.
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={fetchDashboard}>
              <RefreshCw size={14} /> Atualizar
            </button>
            <button className="btn btn-brand" onClick={() => router.push("/app/simulados")}>
              <Target size={14} /> Iniciar simulado
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard
            icon={Flame} label="Streak" value={String(currentStreak)} suffix="dias" trend={12} color="amber"
            mini={
              <div className="row" style={{ gap: 3 }}>
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: i < Math.min(currentStreak, 12) ? "linear-gradient(180deg, #f59e0b, #d97706)" : "rgba(30,41,59,0.6)", opacity: i < Math.min(currentStreak, 12) ? (0.4 + i * 0.05) : 1 }} />
                ))}
              </div>
            }
          />
          <StatCard
            icon={Zap} label="XP Total" value={totalXP.toLocaleString("pt-BR")} trend={28} color="violet"
            mini={
              <div className="row between" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                <span>Nível {currentLevel}</span>
                <span className="mono">+0 esta semana</span>
              </div>
            }
          />
          <StatCard
            icon={Target} label="Meta do dia" value={String(Math.round(goalPct))} suffix="%" trend={null} color="blue"
            mini={
              <div className="col" style={{ gap: 4 }}>
                <div className="progress"><div className="progress-fill progress-fill-green" style={{ width: `${goalPct}%` }} /></div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{data.daily_goal.hours_completed_today}h / {data.daily_goal.hours_goal}h</div>
              </div>
            }
          />
          <StatCard
            icon={CheckCircle2} label="Semana" value={String(weeklyHours.reduce((a, b) => a + b, 0).toFixed(0))} suffix="h" trend={8} color="green"
            mini={<Sparkline data={weeklyHours.length > 1 ? weeklyHours : [0, 1]} color="#34d399" />}
          />
        </div>

        {/* Two-column: progress + donut */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Progresso por área</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Acurácia nas últimas questões</div>
              </div>
            </div>
            <HorizontalBars items={subjects} />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Distribuição de tempo</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {weeklyHours.reduce((a, b) => a + b, 0).toFixed(0)}h · esta semana
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 20, alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}>
                <Donut
                  segments={donutData}
                  size={160} thickness={20}
                  centerValue={`${weeklyHours.reduce((a, b) => a + b, 0).toFixed(0)}h`}
                  centerLabel="esta semana"
                />
              </div>
              <div className="col" style={{ gap: 9, flex: 1, minWidth: 0 }}>
                {donutData.map((d, i) => (
                  <div key={i} className="row between">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="subject-dot" style={{ background: d.color }} />
                      <span style={{ fontSize: 13 }}>{donutNames[i]}</span>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{d.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Today sessions + Quick actions */}
        <div className="grid-14" style={{ marginBottom: 24 }}>
          {/* Recommendation / today */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Recomendação de hoje</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>IA · baseado no seu perfil</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/plano")}>
                Plano completo <ChevronRight size={12} />
              </button>
            </div>
            {data.recommendation ? (
              <div className="col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 12, padding: 14, background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 12, boxShadow: "0 0 18px rgba(37,99,235,0.1)" }}>
                  <div className="col" style={{ flex: 1, gap: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{data.recommendation.subject_label}</span>
                      <span className="badge badge-success" style={{ height: 18, fontSize: 10 }}>● Agora</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{data.recommendation.topic_name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {data.recommendation.hours_allocated}h alocadas · {data.recommendation.type}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStartSession(data.recommendation!.topic_id)}
                    disabled={!!activeSession}
                  >
                    <Play size={11} /> Iniciar
                  </button>
                </div>
              </div>
            ) : (
              <div className="col" style={{ alignItems: "center", padding: "20px 0", gap: 8 }}>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhuma recomendação disponível</div>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push("/app/plano")}>Ver plano</button>
              </div>
            )}

            {/* Recent notifications */}
            {data.recent_notifications.length > 0 && (
              <div className="col" style={{ gap: 8, marginTop: 16 }}>
                <div style={{ height: 1, background: "var(--border)", marginBottom: 4 }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Notificações recentes</div>
                {data.recent_notifications.slice(0, 2).map((n) => (
                  <div key={n.id} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: n.is_read ? "var(--muted-foreground)" : "var(--primary)", flexShrink: 0, marginTop: 4 }} />
                    <span style={{ color: n.is_read ? "var(--muted-foreground)" : "var(--foreground)" }}>{n.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Ações rápidas</h3>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              {quickActions.map((a, i) => {
                const c = actionColors[a.color]
                const Ic = a.icon
                return (
                  <button key={i} onClick={() => router.push(a.href)} className="col" style={{ background: c.bg, border: `1px solid ${c.brd}`, borderRadius: 14, padding: 14, gap: 8, alignItems: "flex-start", cursor: "pointer", transition: "all 200ms", textAlign: "left", fontFamily: "'Outfit', system-ui", color: "inherit" }}>
                    <Ic size={18} color={c.fg} />
                    <div className="col" style={{ lineHeight: 1.2 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{a.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
            <div className="col" style={{ gap: 4 }}>
              <div className="row between" style={{ fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Meta diária</span>
                <span style={{ fontWeight: 600 }}>
                  <span className="text-gradient-green">{data.daily_goal.hours_completed_today}h</span> / {data.daily_goal.hours_goal}h
                </span>
              </div>
              <div className="progress"><div className="progress-fill progress-fill-green" style={{ width: `${goalPct}%` }} /></div>
            </div>
          </div>
        </div>

        {/* Achievements + AI Insight */}
        <div className="grid-14">
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Conquistas recentes</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Últimas medalhas</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/gamificacao")}>
                Ver todas <ChevronRight size={12} />
              </button>
            </div>
            <div className="row" style={{ gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {recentAchievements.map((a, i) => (
                <div key={i} className={`col center ${glowMap[a.color] ?? ""}`} style={{ flexShrink: 0, width: 132, padding: "16px 12px", borderRadius: 14, background: "rgba(15,23,42,0.6)", border: "1px solid var(--border)", gap: 8 }}>
                  <div style={{ fontSize: 32 }}>{a.icon}</div>
                  <div className="col" style={{ alignItems: "center", lineHeight: 1.15 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", textAlign: "center", marginTop: 2 }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-premium" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 80% at 100% 0%, rgba(124,58,237,0.16), transparent 60%)", pointerEvents: "none" }} />
            <div className="row" style={{ gap: 10, marginBottom: 14, position: "relative" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.18)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                <Sparkles size={16} />
              </div>
              <div className="col" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Insight da IA</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>baseado no seu histórico</div>
              </div>
              <span className="badge badge-premium" style={{ marginLeft: "auto" }}>✦ Pro</span>
            </div>
            {data.recommendation ? (
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#e2e8f0", margin: "0 0 14px", position: "relative" }}>
                Foque em <strong style={{ color: "#fcd34d" }}>{data.recommendation.topic_name}</strong> hoje —
                prioridade <strong style={{ color: "#a78bfa" }}>{data.recommendation.priority}</strong> no seu plano.
                Isso pode melhorar seu score.
              </p>
            ) : (
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#e2e8f0", margin: "0 0 14px", position: "relative" }}>
                Complete o diagnóstico para receber recomendações personalizadas da IA.
              </p>
            )}
            <div className="row" style={{ gap: 8, position: "relative" }}>
              <button className="btn btn-violet btn-sm" onClick={() => router.push("/app/plano")}>Aplicar ao plano</button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating session timer */}
      {activeSession && (
        <SessionTimer startedAt={activeSession.startedAt} onEnd={handleEndSession} />
      )}
    </div>
  )
}
