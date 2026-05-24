"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, TrendingUp, Brain, AlertTriangle, Lock, Crown, RefreshCw, BookOpen } from "lucide-react"
import { api } from "@/lib/api"

interface HistoricalYear { year: number; linguagens: number; matematica: number; cn: number; ch: number }
interface ENEMHistorical { user_scores: Record<string, number | null>; historical: HistoricalYear[]; has_user_data: boolean }
interface TopicItem { name: string; frequency: number; priority: string }
interface TopicFrequency { subjects: Record<string, TopicItem[]> }
interface CohortBucket { label: string; count: number; range_start: number; range_end: number }
interface CohortData { distribution: CohortBucket[]; user_score: number | null; percentile: number | null; total_users: number; has_user_data: boolean }
interface ProbableTopics { subjects: Record<string, { name: string; priority: string; frequency: number }[]> }

const SUBJECT_COLORS: Record<string, string> = {
  matematica: "#2563eb", linguagens: "#f59e0b", cn: "#10b981", ch: "#ef4444",
}
const SUBJECT_LABELS: Record<string, string> = {
  matematica: "Matemática", linguagens: "Linguagens", cn: "Ciências da Natureza", ch: "Ciências Humanas",
}
const SUBJECTS = ["linguagens", "matematica", "cn", "ch"]
type Tab = "historico" | "coorte" | "topicos"

export default function AnáliseComparativaPage() {
  const router = useRouter()
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [historical, setHistorical] = useState<ENEMHistorical | null>(null)
  const [frequency, setFrequency] = useState<TopicFrequency | null>(null)
  const [cohort, setCohort] = useState<CohortData | null>(null)
  const [probable, setProbable] = useState<ProbableTopics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("historico")
  const [yearFilter, setYearFilter] = useState<number[]>([2023, 2024])
  const [topicSubj, setTopicSubj] = useState("linguagens")

  useEffect(() => {
    const load = async () => {
      try {
        const [h, f, c, p] = await Promise.all([
          api.get("/analysis/enem-historical"),
          api.get("/analysis/topic-frequency"),
          api.get("/analysis/cohort-comparison"),
          api.get("/analysis/probable-topics"),
        ])
        setHistorical(h.data); setFrequency(f.data); setCohort(c.data); setProbable(p.data)
        setIsPremium(true)
      } catch (err: any) {
        if (err.response?.status === 402) setIsPremium(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={28} />
      </div>
    )
  }

  if (isPremium === false) {
    return (
      <div className="page-scroll">
        <div className="page-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(245,158,11,0.15)", display: "grid", placeItems: "center" }}>
            <Lock size={28} color="#fcd34d" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Funcionalidade Premium</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", maxWidth: 380, lineHeight: 1.6 }}>
              A Análise Comparativa está disponível para assinantes Premium. Compare seu desempenho com as médias do ENEM e outros estudantes.
            </p>
          </div>
          <button className="btn btn-brand btn-lg" onClick={() => router.push("/app/configuracoes/billing")}>
            <Crown size={14} /> Assinar Premium
          </button>
        </div>
      </div>
    )
  }

  if (!historical || !frequency || !cohort) return null

  const historicalFiltered = historical.historical.filter(h => yearFilter.includes(h.year))
  const avgBySubject = SUBJECTS.reduce((acc, s) => {
    const vals = historicalFiltered.map(h => (h as any)[s]).filter(Boolean)
    acc[s] = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 60
    return acc
  }, {} as Record<string, number>)

  const userScores = historical.user_scores

  const insights = [
    {
      color: "green",
      icon: TrendingUp,
      title: historical.has_user_data
        ? `+${Math.max(0, (userScores.matematica ?? 0) - avgBySubject.matematica)}% acima da média em Matemática`
        : "Complete um simulado para ver seus insights",
      desc: historical.has_user_data
        ? `Você acerta ${userScores.matematica ?? 0}% — média ENEM foi ${avgBySubject.matematica}% no recorte.`
        : "Seus dados comparativos aparecerão após o primeiro simulado.",
      action: "Ver desempenho",
    },
    {
      color: "violet",
      icon: Brain,
      title: "Análise por IA do seu perfil",
      desc: "Padrões de erro detectados com base no seu histórico de simulados e questões.",
      action: "Ver análise",
    },
    {
      color: "amber",
      icon: AlertTriangle,
      title: probable ? "Tópicos prioritários 2026" : "Frequência histórica disponível",
      desc: probable
        ? `Tópicos mais prováveis identificados por análise de frequência 2010–2024.`
        : "Dados de frequência baseados em edições anteriores do ENEM.",
      action: "Aplicar ao plano",
    },
  ]

  const bgMap = { green: ["rgba(16,185,129,0.06)", "rgba(16,185,129,0.25)", "#34d399"], violet: ["rgba(124,58,237,0.06)", "rgba(124,58,237,0.3)", "#a78bfa"], amber: ["rgba(245,158,11,0.06)", "rgba(245,158,11,0.3)", "#fbbf24"] } as Record<string, string[]>

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Progresso → Análise IA</div>
            <h1 className="page-title">Análise Comparativa</h1>
          </div>
          <span className="badge badge-premium">✦ Exclusivo Pro</span>
        </div>

        {/* Premium banner */}
        <div className="card card-premium" style={{ padding: 20, marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(37,99,235,0.06))" }} />
          <div className="row between" style={{ position: "relative" }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "grid", placeItems: "center" }}>
                <Brain size={20} color="#fff" />
              </div>
              <div className="col" style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Análise gerada pela IA</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Baseada em {historical.historical.length} edições do ENEM (2010–2024)
                </div>
              </div>
            </div>
            <button className="btn btn-violet btn-sm" onClick={() => window.location.reload()}><RefreshCw size={12} /> Recalcular</button>
          </div>
        </div>

        {/* Tabs + year filter */}
        <div className="row between" style={{ marginBottom: 18 }}>
          <div className="tabs">
            {([["historico", "vs. ENEM Histórico"], ["coorte", "vs. Coorte"], ["topicos", "Frequência de tópicos"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={`tab ${tab === id ? "tab-active" : ""}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === "historico" && (
            <div className="row" style={{ gap: 6 }}>
              {[2019, 2020, 2021, 2022, 2023, 2024].map(y => (
                <button key={y} className={`chip ${yearFilter.includes(y) ? "chip-active" : ""}`} onClick={() => setYearFilter(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])} style={{ fontSize: 11, padding: "4px 8px" }}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insights cards */}
        <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
          {insights.map((c, i) => {
            const Icon = c.icon
            const [bg, brd, fg] = bgMap[c.color]
            return (
              <div key={i} className="card" style={{ padding: 18, background: bg, border: `1px solid ${brd}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${fg}20`, color: fg, display: "grid", placeItems: "center", marginBottom: 12 }}>
                  <Icon size={15} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 12 }}>{c.desc}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push("/app/plano")}>{c.action} →</button>
              </div>
            )
          })}
        </div>

        {/* vs ENEM histórico */}
        {tab === "historico" && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>
                Sua nota vs. média ENEM {yearFilter.join(", ")}
              </h3>
              <div className="row" style={{ gap: 14, fontSize: 11.5 }}>
                <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: "#3b82f6" }} />Você</div>
                <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: "#475569" }} />Média ENEM</div>
              </div>
            </div>
            <div className="col" style={{ gap: 18 }}>
              {SUBJECTS.map(subj => {
                const youVal = userScores[subj] ?? null
                const avgVal = avgBySubject[subj]
                const diff = youVal != null ? youVal - avgVal : null
                return (
                  <div key={subj}>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{SUBJECT_LABELS[subj]}</span>
                      <div className="row" style={{ gap: 14, fontSize: 12 }}>
                        {youVal != null && <span style={{ color: "#93c5fd", fontWeight: 600 }}>{youVal}%</span>}
                        <span style={{ color: "var(--muted-foreground)" }}>{avgVal}%</span>
                        {diff != null && <span style={{ color: diff >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 600, width: 50, textAlign: "right" }}>
                          {diff >= 0 ? "+" : ""}{diff}%
                        </span>}
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 18 }}>
                      <div style={{ position: "absolute", inset: 0, height: 8, top: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999 }} />
                      <div style={{ position: "absolute", top: 5, height: 8, width: `${avgVal}%`, background: "#475569", borderRadius: 999, opacity: 0.8 }} />
                      {youVal != null && <div style={{ position: "absolute", top: 5, height: 8, width: `${youVal}%`, background: "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 999, boxShadow: "0 0 12px rgba(37,99,235,0.4)" }} />}
                    </div>
                  </div>
                )
              })}
            </div>
            {!historical.has_user_data && (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#fcd34d" }}>
                Complete ao menos um simulado para ver seus scores comparados com as médias históricas.
              </div>
            )}
          </div>
        )}

        {/* vs Coorte */}
        {tab === "coorte" && (
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Distribuição de scores na plataforma</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {cohort.total_users} estudantes com simulado realizado
                </div>
              </div>
              {cohort.percentile != null && (
                <div className="col" style={{ alignItems: "flex-end" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em" }} className="text-gradient-green">{cohort.percentile}°</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>percentil</div>
                </div>
              )}
            </div>
            {cohort.total_users === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                Ainda não há dados de coorte disponíveis.
              </div>
            ) : (
              <div className="row" style={{ gap: 4, height: 120, alignItems: "flex-end" }}>
                {cohort.distribution.map((b, i) => {
                  const maxCount = Math.max(...cohort.distribution.map(d => d.count), 1)
                  const h = (b.count / maxCount) * 100
                  const isUser = cohort.user_score != null && cohort.user_score >= b.range_start && cohort.user_score < b.range_end
                  return (
                    <div key={i} className="col" style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${h}%`, background: isUser ? "#2563eb" : "#334155", borderRadius: "4px 4px 0 0", opacity: isUser ? 1 : 0.7, boxShadow: isUser ? "0 0 12px rgba(37,99,235,0.4)" : "none" }} />
                      <div style={{ fontSize: 8.5, color: "var(--muted-foreground)", textAlign: "center" }}>{b.label}</div>
                    </div>
                  )
                })}
              </div>
            )}
            {cohort.user_score != null && (
              <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>
                Seu score mais recente: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{cohort.user_score}</span>
                {cohort.percentile != null && <> · melhor que <strong style={{ color: "var(--foreground)" }}>{cohort.percentile}%</strong> dos estudantes</>}
              </div>
            )}
          </div>
        )}

        {/* Frequência de tópicos */}
        {tab === "topicos" && (
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Frequência histórica de tópicos</h3>
            </div>
            <div className="tabs" style={{ marginBottom: 16 }}>
              {SUBJECTS.map(s => (
                <button key={s} className={`tab ${topicSubj === s ? "tab-active" : ""}`} onClick={() => setTopicSubj(s)} style={{ fontSize: 11.5 }}>
                  {SUBJECT_LABELS[s].split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="col" style={{ gap: 10, maxHeight: 400, overflowY: "auto" }}>
              {(frequency.subjects[topicSubj] ?? []).map(topic => (
                <div key={topic.name}>
                  <div className="row between" style={{ marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{topic.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: SUBJECT_COLORS[topicSubj] }}>{topic.frequency}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999 }}>
                    <div style={{ width: `${topic.frequency}%`, height: "100%", background: SUBJECT_COLORS[topicSubj], borderRadius: 999, opacity: topic.priority === "critical" ? 1 : topic.priority === "high" ? 0.75 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 16, width: "100%" }} onClick={() => router.push("/app/plano")}>
              <BookOpen size={13} /> Ver no Plano de Estudos
            </button>
          </div>
        )}

        {/* Tópicos mais prováveis */}
        {probable && (
          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Tópicos mais prováveis — ENEM 2026</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Baseado em frequência histórica e peso TRI</div>
              </div>
              <TrendingUp size={16} style={{ color: "var(--primary)" }} />
            </div>
            <div className="grid-2">
              {SUBJECTS.map(subj => (
                <div key={subj}>
                  <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                    <span className="subject-dot" style={{ background: SUBJECT_COLORS[subj] }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{SUBJECT_LABELS[subj]}</span>
                  </div>
                  <div className="col" style={{ gap: 6 }}>
                    {(probable.subjects[subj] ?? []).slice(0, 4).map((t, i) => (
                      <div key={t.name} className="row" style={{ gap: 10, padding: "8px 12px", background: "rgba(15,23,42,0.4)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", width: 16, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 12.5 }}>{t.name}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: t.priority === "critical" ? "#fca5a5" : "#fcd34d", background: `${t.priority === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"}`, padding: "2px 6px", borderRadius: 4 }}>
                          {t.frequency}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
