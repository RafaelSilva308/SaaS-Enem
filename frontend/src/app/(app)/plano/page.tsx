"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, RefreshCw, Sparkles, AlertTriangle, Check, Play,
  Plus, Calendar, ChevronRight, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { ContingencyModal } from "@/components/study-plan/ContingencyModal"
import { TurboSessionSheet } from "@/components/study-plan/TurboSessionSheet"

/* ── Types ── */
interface Topic {
  id: string; name: string; subject: string; subject_label: string
  hours_allocated: number; type: string; priority: string
  scheduled_days: string[]; is_completed: boolean
}
interface Sprint {
  id: string; week_number: number; start_date: string; end_date: string
  theme: string | null; total_hours_allocated: number; hours_completed: number
  status: string; progress_percentage: number; topics: Topic[]
}
interface SubjectProgress {
  subject: string; label: string; color: string
  topics_completed: number; topics_total: number
  hours_completed: number; hours_total: number; percentage: number
}
interface StudyPlan {
  plan_id: string; status: string; daily_hours_goal: number
  weeks_remaining: number; total_weeks: number; enem_date: string
  overall_progress: number; current_sprint: Sprint | null
  next_sprint: Sprint | null; subjects_progress: SubjectProgress[]
  all_sprints: Sprint[]
}
interface ContingencyStatus {
  delay_detected: boolean; severity: string; days_behind: number
  hours_behind: number; delay_percent: number; health_score: number
  weakest_subject: string | null
}

const ALL_DAYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]
const DAY_LABELS: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
}

const AREA_COLORS: Record<string, string> = {
  matematica: "#2563eb", linguagens: "#f59e0b", cn: "#10b981", ch: "#ef4444", redacao: "#7c3aed",
}
const AREA_LABELS: Record<string, string> = {
  matematica: "Matemática e Suas Tecnologias",
  linguagens: "Linguagens, Códigos e Suas Tecnologias",
  cn: "Ciências da Natureza e Suas Tecnologias",
  ch: "Ciências Humanas e Suas Tecnologias",
  redacao: "Redação",
}

function buildDaySlots(sprint: Sprint | null): { day: string; date: string; done: number; total: number; today: boolean }[] {
  if (!sprint) return []
  const start = new Date(sprint.start_date + "T00:00:00")
  const todayStr = new Date().toISOString().split("T")[0]
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    const dayOfWeek = ALL_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
    const dayTopics = sprint.topics.filter(t => t.scheduled_days.includes(dayOfWeek))
    const done = dayTopics.filter(t => t.is_completed).length
    return { day: DAY_LABELS[dayOfWeek], date: String(d.getDate()), done, total: dayTopics.length, today: dateStr === todayStr }
  })
}

function getBadgeClass(area: string): string {
  const map: Record<string, string> = { matematica: "s-mat", linguagens: "s-lin", cn: "s-nat", ch: "s-hum", redacao: "s-red" }
  return `badge ${map[area] ?? "badge-default"}`
}

/* ── Main Page ── */
export default function PlanoPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeView, setActiveView] = useState<"sprint" | "timeline" | "areas">("sprint")
  const [contingency, setContingency] = useState<ContingencyStatus | null>(null)
  const [contingencyModalOpen, setContingencyModalOpen] = useState(false)
  const [turboOpen, setTurboOpen] = useState(false)
  const [adjustHours, setAdjustHours] = useState(2)
  const [adjustDays, setAdjustDays] = useState(["seg", "ter", "qua", "qui", "sex"])
  const [adjusting, setAdjusting] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/study-plans/me")
      setPlan(data)
      setAdjustHours(data.daily_hours_goal ?? 2)
    } catch (err: any) {
      if (err.response?.status === 404) setPlan(null)
      else toast.error("Erro ao carregar plano")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
    api.get("/contingency/status")
      .then(({ data }) => setContingency(data))
      .catch(() => { /* plano pode não existir ainda */ })
  }, [fetchPlan])

  async function handleGenerate(force = false) {
    setGenerating(true)
    try {
      const { data } = await api.post("/study-plans/generate", { force_regenerate: force || !!plan })
      setPlan(data)
      toast.success("Plano de estudos gerado!")
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao gerar plano")
    } finally {
      setGenerating(false)
    }
  }

  async function handleAdjust() {
    if (!plan || adjustDays.length === 0) return toast.error("Selecione pelo menos 1 dia")
    setAdjusting(true)
    try {
      await api.put(`/study-plans/${plan.plan_id}/adjust`, { daily_hours_goal: adjustHours, available_days: adjustDays })
      toast.success("Plano ajustado!")
      fetchPlan()
      setShowAdjust(false)
    } catch { toast.error("Erro ao ajustar plano") }
    finally { setAdjusting(false) }
  }

  async function handleTopicToggle(topicId: string) {
    try {
      await api.post(`/study-plans/topics/${topicId}/complete`)
      fetchPlan()
    } catch { toast.error("Erro ao marcar tópico") }
  }

  async function handleContingencyConfirm() {
    await api.post("/contingency/regenerate")
    setContingencyModalOpen(false)
    setContingency(prev => prev ? { ...prev, delay_detected: false } : prev)
    fetchPlan()
    toast.success("Plano de contingência ativado!")
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={28} />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="page-scroll">
        <div className="page-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 24, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "grid", placeItems: "center" }}>
            <Sparkles size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 8 }}>Crie seu plano de estudos</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
              Baseado no seu diagnóstico, vamos criar um plano personalizado com tópicos distribuídos semana a semana até o ENEM.
            </p>
          </div>
          <button className="btn btn-brand btn-lg" onClick={() => handleGenerate()} disabled={generating}>
            {generating ? <><span className="spinner" />&nbsp;Gerando…</> : <><Sparkles size={16} /> Gerar meu plano</>}
          </button>
        </div>
      </div>
    )
  }

  const enem = new Date(plan.enem_date + "T00:00:00")
  const daysLeft = Math.ceil((enem.getTime() - Date.now()) / 86400000)
  const daySlots = buildDaySlots(plan.current_sprint)
  const sprint = plan.current_sprint

  const todayTopics = sprint?.topics.filter(t => {
    const todayIdx = new Date().getDay()
    const dayKey = ALL_DAYS[todayIdx === 0 ? 6 : todayIdx - 1]
    return t.scheduled_days.includes(dayKey)
  }) ?? []

  return (
    <div className="page-scroll">
      {contingency && (
        <ContingencyModal open={contingencyModalOpen} status={contingency} onClose={() => setContingencyModalOpen(false)} onConfirm={handleContingencyConfirm} />
      )}
      <TurboSessionSheet open={turboOpen} subject={contingency?.weakest_subject ?? undefined} onClose={() => setTurboOpen(false)} />

      <div className="page-inner stagger">
        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Estudo → Plano personalizado</div>
            <h1 className="page-title">Plano de Estudos</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowAdjust(v => !v)}>
              <Calendar size={14} /> {showAdjust ? "Fechar" : "Vista mensal"}
            </button>
            <button className="btn btn-violet" onClick={() => handleGenerate(true)} disabled={generating}>
              {generating ? <span className="spinner" /> : <Sparkles size={14} />}
              Regenerar com IA
            </button>
          </div>
        </div>

        {/* Contingency banner */}
        {contingency?.delay_detected && (
          <div className="card" style={{ padding: 14, marginBottom: 20, background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
            <div className="row" style={{ gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245, 158, 11, 0.15)", display: "grid", placeItems: "center", color: "#fcd34d", flexShrink: 0 }}>
                <AlertTriangle size={16} />
              </div>
              <div className="col" style={{ flex: 1, lineHeight: 1.4 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{contingency.days_behind} sessões em atraso esta semana</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Quer ativar uma <strong style={{ color: "#fcd34d" }}>Turbo Session</strong> agora para recuperar?
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setContingencyModalOpen(true)} style={{ borderColor: "rgba(245,158,11,0.3)", color: "#fcd34d", background: "rgba(245,158,11,0.08)" }}>
                Atualizar plano
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setTurboOpen(true)}>
                <Zap size={12} /> Turbo 15min
              </button>
            </div>
          </div>
        )}

        {/* Weekly progress */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                {sprint ? `Semana ${sprint.week_number}` : "Semana atual"}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>Progresso semanal</h3>
            </div>
            <div className="row" style={{ gap: 24 }}>
              <div className="col" style={{ alignItems: "flex-end" }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }} className="text-gradient-green">
                  {sprint?.progress_percentage ?? 0}%
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>completado</div>
              </div>
              <div style={{ width: 1, background: "var(--border)" }} />
              <div className="col" style={{ alignItems: "flex-end" }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>
                  {sprint?.hours_completed.toFixed(0) ?? 0}h{" "}
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>/ {sprint?.total_hours_allocated.toFixed(0) ?? plan.daily_hours_goal * 5}h</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>meta semanal</div>
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 6, minWidth: 560 }}>
            {daySlots.map((d, i) => {
              const pct = d.total ? d.done / d.total : 0
              const isPast = i < 7 && !d.today
              return (
                <div key={i} className="col" style={{ padding: 10, gap: 6, borderRadius: 12, border: d.today ? "1px solid rgba(37, 99, 235, 0.5)" : "1px solid var(--border)", background: d.today ? "rgba(37, 99, 235, 0.08)" : "rgba(15, 23, 42, 0.4)", boxShadow: d.today ? "0 0 16px rgba(37,99,235,0.2)" : "none", minHeight: 90, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.day}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.025em" }}>{d.date}</div>
                  {d.total > 0 && (
                    <>
                      <div style={{ width: "100%", height: 4, background: "rgba(30,41,59,0.6)", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
                        <div style={{ height: "100%", width: `${pct * 100}%`, background: pct === 1 ? "linear-gradient(90deg, #10b981, #34d399)" : d.today ? "linear-gradient(90deg, #2563eb, #3b82f6)" : "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: 999 }} />
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: isPast && pct < 1 ? "#fca5a5" : "var(--muted-foreground)" }}>
                        {d.done}/{d.total}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div></div>
        </div>

        {/* View tabs */}
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="tabs">
            {(["sprint", "timeline", "areas"] as const).map((v, i) => (
              <button key={v} className={`tab ${activeView === v ? "tab-active" : ""}`} onClick={() => setActiveView(v)}>
                {["Sprint atual", "Calendário", "Por área"][i]}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm">
            <Plus size={12} /> Adicionar sessão
          </button>
        </div>

        {/* Sprint view */}
        {activeView === "sprint" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
                Hoje — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
            </div>
            <div className="col" style={{ gap: 10, marginBottom: 28 }}>
              {todayTopics.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhuma sessão planejada para hoje.</div>
                </div>
              ) : todayTopics.map((t) => {
                const borderBg = t.is_completed
                  ? { brd: "rgba(16,185,129,0.3)", bg: "rgba(16,185,129,0.05)" }
                  : { brd: "var(--border)", bg: "rgba(15,23,42,0.5)" }
                return (
                  <div key={t.id} className="card" style={{ padding: 18, border: `1px solid ${borderBg.brd}`, background: borderBg.bg }}>
                    <div className="row" style={{ gap: 16 }}>
                      <div className="col" style={{ flex: 1, gap: 8 }}>
                        <div className="row" style={{ gap: 8 }}>
                          <span className={getBadgeClass(t.subject)}>{t.subject_label}</span>
                          {t.is_completed && <span className="badge badge-success"><Check size={10} /> Concluída</span>}
                          {!t.is_completed && <span className="badge badge-default">Pendente</span>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: t.is_completed ? "var(--muted-foreground)" : "var(--foreground)", textDecoration: t.is_completed ? "line-through" : "none" }}>
                          {t.name}
                        </div>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", padding: "2px 8px", background: "rgba(30,41,59,0.6)", borderRadius: 999, border: "1px solid var(--border)" }}>
                            {t.hours_allocated}h · {t.type}
                          </span>
                          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", padding: "2px 8px", background: "rgba(30,41,59,0.6)", borderRadius: 999, border: "1px solid var(--border)" }}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                      <div>
                        {t.is_completed ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleTopicToggle(t.id)}>
                            <Check size={11} /> Desfazer
                          </button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => handleTopicToggle(t.id)}>
                            <Play size={11} /> Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Timeline view */}
        {activeView === "timeline" && (
          <div className="col" style={{ gap: 8, marginBottom: 24 }}>
            {plan.all_sprints.map((s) => {
              const todayStr = new Date().toISOString().split("T")[0]
              const isCurrent = s.start_date <= todayStr && todayStr <= s.end_date
              const isPast = s.end_date < todayStr
              return (
                <div key={s.id} className="card card-hover" style={{ padding: 16, border: isCurrent ? "1px solid rgba(37,99,235,0.4)" : "1px solid var(--border)", background: isCurrent ? "rgba(37,99,235,0.05)" : undefined, opacity: isPast && s.progress_percentage === 0 ? 0.6 : 1 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <div style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: isCurrent ? "#3b82f6" : isPast ? (s.progress_percentage === 100 ? "#10b981" : "#f59e0b") : "var(--border)" }} />
                    <div className="col" style={{ flex: 1 }}>
                      <div className="row between">
                        <div className="row" style={{ gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.theme ?? "Revisão geral"}</span>
                          {isCurrent && <span className="badge badge-primary" style={{ height: 18, fontSize: 10 }}>Atual</span>}
                          {s.progress_percentage === 100 && <span className="badge badge-success" style={{ height: 18, fontSize: 10 }}><Check size={9} /> Concluído</span>}
                        </div>
                        <div className="row" style={{ gap: 8, fontSize: 12 }}>
                          <span className="mono" style={{ color: "var(--muted-foreground)" }}>{s.total_hours_allocated.toFixed(0)}h</span>
                          <span style={{ fontWeight: 600 }}>{s.progress_percentage}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                        Sem. {s.week_number} · {new Date(s.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – {new Date(s.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </div>
                      <div style={{ height: 4, background: "rgba(30,41,59,0.6)", borderRadius: 999, marginTop: 8 }}>
                        <div style={{ width: `${s.progress_percentage}%`, height: "100%", background: s.progress_percentage === 100 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Areas view */}
        {activeView === "areas" && (
          <div style={{ marginBottom: 24 }}>
            <div className="col" style={{ gap: 12 }}>
              {plan.subjects_progress.map((sp) => {
                const [open, setOpen] = useState(false)
                const color = AREA_COLORS[sp.subject] ?? "#94a3b8"
                const allTopics = plan.all_sprints.flatMap(s => s.topics.filter(t => t.subject === sp.subject))
                return (
                  <div key={sp.subject} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <button className="row" style={{ width: "100%", padding: "16px 20px", gap: 12, background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }} onClick={() => setOpen(v => !v)}>
                      <span className="subject-dot" style={{ background: color }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{sp.label}</span>
                      <div style={{ flex: 1, maxWidth: 200, height: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${sp.percentage}%`, height: "100%", background: color, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)", width: 50, textAlign: "right" }}>{sp.topics_completed}/{sp.topics_total}</span>
                      <ChevronRight size={14} style={{ color: "var(--muted-foreground)", transform: open ? "rotate(90deg)" : "none", transition: "transform 180ms" }} />
                    </button>
                    {open && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 20px 16px" }}>
                        <div className="col" style={{ gap: 6 }}>
                          {allTopics.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhum tópico encontrado.</div>
                          ) : allTopics.map(t => (
                            <div key={t.id} className="row" style={{ gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)", opacity: t.is_completed ? 0.6 : 1 }}>
                              {t.is_completed
                                ? <Check size={12} style={{ color: "#10b981", flexShrink: 0 }} />
                                : <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid var(--border-strong)", flexShrink: 0 }} />
                              }
                              <span style={{ flex: 1, fontSize: 12.5, textDecoration: t.is_completed ? "line-through" : "none" }}>{t.name}</span>
                              <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{t.hours_allocated}h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Distribution + AI card */}
        <div className="grid-14">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 16 }}>Distribuição até o ENEM</h3>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>{daysLeft} dias restantes</div>
            <div className="col" style={{ gap: 12 }}>
              {plan.subjects_progress.map((sp) => {
                const color = AREA_COLORS[sp.subject] ?? "#94a3b8"
                return (
                  <div key={sp.subject}>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="subject-dot" style={{ background: color }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{AREA_LABELS[sp.subject] ?? sp.label}</span>
                      </div>
                      <div className="row" style={{ gap: 12, fontSize: 12 }}>
                        <span className="mono" style={{ color: "var(--muted-foreground)" }}>{sp.hours_total.toFixed(0)}h</span>
                        <span style={{ fontWeight: 600, width: 32, textAlign: "right" }}>
                          {Math.round(sp.hours_total / (plan.subjects_progress.reduce((a, s) => a + s.hours_total, 0) || 1) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "rgba(30,41,59,0.6)", borderRadius: 999 }}>
                      <div style={{ width: `${sp.percentage}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 999, boxShadow: `0 0 10px ${color}40` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI plan card */}
          <div className="card card-premium" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 100% 0%, rgba(124,58,237,0.15), transparent 60%)", pointerEvents: "none" }} />
            <div className="row" style={{ gap: 10, marginBottom: 14, position: "relative" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124,58,237,0.18)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                <Sparkles size={16} />
              </div>
              <div className="col" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Plano gerado pela IA</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>otimizado para seu perfil</div>
              </div>
            </div>
            <div className="col" style={{ gap: 8, fontSize: 12.5, color: "#cbd5e1", position: "relative" }}>
              {plan.subjects_progress.filter(s => s.percentage < 50).slice(0, 2).map(s => (
                <div key={s.subject} className="row" style={{ gap: 8 }}>
                  <Check size={14} color="#6ee7b7" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Foco em <strong style={{ color: "#fcd34d" }}>{s.label}</strong> — {s.percentage}% completo</span>
                </div>
              ))}
              <div className="row" style={{ gap: 8 }}>
                <Check size={14} color="#6ee7b7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Simulado completo a cada 14 dias</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Check size={14} color="#6ee7b7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Revisão espaçada de pontos fracos</span>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 16, position: "relative" }}>
              <button className="btn btn-violet btn-sm" onClick={() => handleGenerate(true)} disabled={generating}>
                <RefreshCw size={11} /> Regenerar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdjust(v => !v)}>Personalizar</button>
            </div>

            {/* Adjust panel inline */}
            {showAdjust && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(15,23,42,0.5)", borderRadius: 12, border: "1px solid var(--border)", position: "relative" }}>
                <div className="col" style={{ gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Horas/dia: <strong>{adjustHours}h</strong></div>
                  <input type="range" min={0.5} max={8} step={0.5} value={adjustHours} onChange={e => setAdjustHours(+e.target.value)} style={{ width: "100%", accentColor: "var(--primary)" }} />
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {ALL_DAYS.map(d => (
                      <button key={d} onClick={() => setAdjustDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} className={`chip ${adjustDays.includes(d) ? "chip-active" : ""}`} style={{ fontSize: 11, padding: "4px 8px" }}>
                        {DAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleAdjust} disabled={adjusting} style={{ width: "100%" }}>
                    {adjusting ? <span className="spinner" /> : null} Salvar e recalcular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
