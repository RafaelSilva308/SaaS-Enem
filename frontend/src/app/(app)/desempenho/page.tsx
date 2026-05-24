"use client"

import { useEffect, useState } from "react"
import { Loader2, Target, CheckCircle2, Clock, Zap, FileText, RefreshCw, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

interface OverviewData {
  hours_studied: number; questions_answered: number; accuracy_rate: number
  current_streak: number; exams_completed: number; topics_completed: number
  topics_total: number; plan_progress: number
}
interface ErrorPattern { type: string; description: string; count: number; percentage: number; color: string }
interface ErrorData { total_wrong: number; total_unanswered: number; patterns: ErrorPattern[] }
interface CompData { user_scores: Record<string, number>; national_avg: Record<string, number>; percentile: number }
interface SubjectPrediction { subject: string; subject_label: string; projected: number; trend: string }
interface PredictionData {
  projected_score: number | null; confidence_low: number | null; confidence_high: number | null
  by_subject: Record<string, SubjectPrediction>; has_enough_data: boolean; message: string | null
}
interface HistoryItem {
  exam_id: string; exam_type: string; completed_at: string; overall_tri: number | null; raw_score: number
  tri_by_subject: Record<string, number>
}

type Tab = "geral" | "materia" | "hist" | "fracos"

const SUBJECT_COLORS: Record<string, string> = {
  matematica: "#2563eb", linguagens: "#f59e0b", cn: "#10b981", ch: "#ef4444",
}
const SUBJECT_LABELS: Record<string, string> = {
  matematica: "Matemática", linguagens: "Linguagens", cn: "Ciências da Natureza", ch: "Ciências Humanas",
}
const SUBJECT_LIGHT: Record<string, string> = {
  matematica: "#60a5fa", linguagens: "#fbbf24", cn: "#34d399", ch: "#f87171",
}

function Sparkline({ data, color = "#60a5fa" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const w = 200, h = 32
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2])
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
  const fill = `${d} L ${w} ${h} L 0 ${h} Z`
  const gid = `sp${color.replace("#", "")}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} stroke="#020617" strokeWidth="2" />)}
    </svg>
  )
}

export default function DesempenhoPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("geral")
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [errors, setErrors] = useState<ErrorData | null>(null)
  const [comp, setComp] = useState<CompData | null>(null)
  const [pred, setPred] = useState<PredictionData | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/performance/overview"),
      api.get("/performance/error-patterns"),
      api.get("/performance/comparison"),
      api.get("/performance/enem-prediction"),
      api.get("/performance/tri-history"),
    ])
      .then(([ov, er, co, pr, hi]) => {
        setOverview(ov.data); setErrors(er.data); setComp(co.data)
        setPred(pr.data); setHistory(hi.data.history ?? [])
      })
      .catch(() => toast.error("Erro ao carregar dados de desempenho"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  const histScores = history.map(h => h.raw_score)
  const triScores = history.filter(h => h.overall_tri != null).map(h => h.overall_tri as number)

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Progresso → Desempenho</div>
            <h1 className="page-title">Desempenho</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary"><FileText size={14} /> Baixar PDF</button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={14} /> Atualizar</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="row between" style={{ marginBottom: 20 }}>
          <div className="tabs">
            {([["geral", "Visão Geral"], ["materia", "Por Matéria"], ["hist", "Histórico"], ["fracos", "Pontos Fracos"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={`tab ${tab === id ? "tab-active" : ""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <button className="chip">Últimos 30 dias <ChevronDown size={11} /></button>
        </div>

        {/* Stat row */}
        {overview && (
          <div className="grid-4" style={{ marginBottom: 20 }}>
            {[
              { icon: Target, label: "Pontuação simulada", value: pred?.projected_score ? String(pred.projected_score) : `${overview.accuracy_rate.toFixed(0)}%`, trend: 5.4, color: "blue", mini: <Sparkline data={histScores.length > 1 ? histScores : [0, 1]} color="#60a5fa" /> },
              { icon: CheckCircle2, label: "Taxa de acerto", value: `${overview.accuracy_rate.toFixed(1)}`, suffix: "%", trend: 4.2, color: "green", mini: <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{overview.questions_answered} questões respondidas</div> },
              { icon: Clock, label: "Horas estudadas", value: `${overview.hours_studied.toFixed(0)}`, suffix: "h", trend: 12, color: "amber", mini: <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>≈ {(overview.hours_studied / 30).toFixed(1)}h por dia</div> },
              { icon: Zap, label: "Streak", value: String(overview.current_streak), suffix: "dias", trend: null, color: "violet", mini: <div className="row" style={{ gap: 3 }}>{Array.from({ length: 14 }).map((_, i) => <div key={i} style={{ flex: 1, height: 12, borderRadius: 3, background: i < Math.min(overview.current_streak, 12) ? "linear-gradient(180deg, #f59e0b, #d97706)" : "rgba(30,41,59,0.6)" }} />)}</div> },
            ].map((s, i) => {
              const Icon = s.icon
              const iconColors: Record<string, string> = { blue: "#60a5fa", green: "#34d399", violet: "#a78bfa", amber: "#fbbf24" }
              const iconBg: Record<string, string> = { blue: "rgba(37,99,235,0.12)", green: "rgba(16,185,129,0.12)", violet: "rgba(124,58,237,0.12)", amber: "rgba(245,158,11,0.12)" }
              return (
                <div key={i} className={`card card-hover ${s.color === "violet" ? "card-premium" : ""}`} style={{ padding: 20 }}>
                  <div className="row between" style={{ marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg[s.color], display: "grid", placeItems: "center", color: iconColors[s.color] }}><Icon size={18} /></div>
                    {s.trend != null && <div className="row" style={{ gap: 4, fontSize: 11.5, color: s.trend > 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 600 }}><span>{s.trend > 0 ? "↑" : "↓"}</span>{Math.abs(s.trend)}%</div>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 6 }}>{s.label}</div>
                  <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
                    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
                    {s.suffix && <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{s.suffix}</div>}
                  </div>
                  {s.mini && <div style={{ marginTop: 14 }}>{s.mini}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Evolution line chart */}
        {histScores.length > 1 && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Evolução da pontuação</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{history.length} simulados</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="chip chip-active">Pontuação</button>
                {triScores.length > 1 && <button className="chip">TRI</button>}
              </div>
            </div>
            <Sparkline data={histScores} color="#60a5fa" />
            <div className="row between" style={{ marginTop: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
              {history.slice(-Math.min(history.length, 6)).map((h, i) => (
                <span key={i} className="mono">{new Date(h.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
              ))}
            </div>
          </div>
        )}

        {/* Por matéria */}
        {tab === "materia" && comp && (
          <div className="grid-14" style={{ marginBottom: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div className="row between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Detalhamento por matéria</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted-foreground)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "10px 0", fontWeight: 500 }}>Matéria</th>
                    <th style={{ padding: "10px 8px", fontWeight: 500, width: 80 }}>Score</th>
                    <th style={{ padding: "10px 8px", fontWeight: 500, width: 180 }}>Progresso</th>
                    <th style={{ padding: "10px 8px", fontWeight: 500, width: 80, textAlign: "right" }}>Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(comp.user_scores).map(([subj, score], i) => {
                    const color = SUBJECT_COLORS[subj] ?? "#94a3b8"
                    const colorLight = SUBJECT_LIGHT[subj] ?? color
                    const avg = comp.national_avg[subj] ?? 60
                    const trend = score - avg
                    return (
                      <tr key={subj} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 0" }}>
                          <div className="row" style={{ gap: 8 }}>
                            <span className="subject-dot" style={{ background: color }} />
                            <span style={{ fontWeight: 500 }}>{SUBJECT_LABELS[subj] ?? subj}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px" }}><span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{score.toFixed(0)}</span></td>
                        <td style={{ padding: "12px 8px" }}>
                          <div className="row" style={{ gap: 8 }}>
                            <div style={{ flex: 1, height: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999 }}>
                              <div style={{ width: `${Math.min(100, score)}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${colorLight})`, borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: "right" }}>{score.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "right" }}>
                          <span className="row" style={{ gap: 3, justifyContent: "flex-end", fontSize: 12, color: trend >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 600 }}>
                            <span>{trend >= 0 ? "↑" : "↓"}</span>{Math.abs(trend).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Error patterns */}
            {errors && (
              <div className="card" style={{ padding: 24 }}>
                <div className="row between" style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Pontos a fortalecer</h3>
                  <span className="badge badge-rose">{errors.total_wrong} erros</span>
                </div>
                <div className="col" style={{ gap: 10 }}>
                  {errors.patterns.map((p, i) => (
                    <div key={i} className="row" style={{ gap: 12, padding: 12, background: "rgba(15,23,42,0.4)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${p.color}1f`, color: p.color, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }} className="mono">
                        {p.percentage}%
                      </div>
                      <div className="col" style={{ flex: 1, lineHeight: 1.2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.type}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{p.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Histórico */}
        {tab === "hist" && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="row between" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Atividade recente</h3>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>Nenhum simulado concluído ainda.</div>
            ) : (
              <div className="col" style={{ gap: 0 }}>
                {[...history].reverse().map((h, i) => (
                  <div key={h.exam_id} className="row" style={{ padding: "14px 24px", borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none", gap: 16, fontSize: 13 }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", width: 24 }}>{i + 1}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", width: 80, flexShrink: 0 }} className="mono">{new Date(h.completed_at).toLocaleDateString("pt-BR")}</span>
                    <span style={{ flex: 1, color: "var(--muted-foreground)", fontSize: 12.5 }}>{h.exam_type === "complete" ? "Simulado Completo" : h.exam_type === "by_subject" ? "Por Área" : "Quiz"}</span>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{h.raw_score}% bruto</span>
                    {h.overall_tri != null ? (
                      <span style={{ fontWeight: 700, color: "var(--primary)", width: 72, textAlign: "right" }} className="mono">{h.overall_tri} TRI</span>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)", width: 72, textAlign: "right", opacity: 0.4 }}>—</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pontos fracos */}
        {tab === "fracos" && errors && (
          <div className="col" style={{ gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 4 }}>Padrões de erro</h3>
            {errors.patterns.map((p, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div className="row" style={{ gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}20`, color: p.color, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>
                    {p.percentage}%
                  </div>
                  <div className="col" style={{ flex: 1, lineHeight: 1.3 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.type}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{p.description}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push("/banco-questoes")}>Praticar</button>
                </div>
                <div style={{ height: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999 }}>
                  <div style={{ width: `${p.percentage}%`, height: "100%", background: p.color, borderRadius: 999, boxShadow: `0 0 8px ${p.color}40` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Geral — prediction card */}
        {tab === "geral" && pred?.projected_score && (
          <div className="card card-premium" style={{ padding: 24, marginTop: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 100% 0%, rgba(37,99,235,0.12), transparent 60%)" }} />
            <div className="row between" style={{ position: "relative" }}>
              <div className="col" style={{ gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Projeção ENEM</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>baseado em {history.length} simulados</div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em" }} className="text-gradient-brand">{pred.projected_score}</div>
              </div>
              <div className="col" style={{ gap: 8, alignItems: "flex-end" }}>
                {pred.confidence_low && pred.confidence_high && (
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    IC: {pred.confidence_low} – {pred.confidence_high}
                  </div>
                )}
                <span className="badge badge-primary">+{(pred.projected_score - (histScores[histScores.length - 2] ?? pred.projected_score)).toFixed(0)} pts vs anterior</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
