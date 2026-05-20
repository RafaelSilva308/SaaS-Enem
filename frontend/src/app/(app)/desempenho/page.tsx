"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { BarChart2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { OverviewCards } from "@/components/performance/OverviewCards"

// Lazy-load heavy chart components — reduces initial bundle
const ErrorPatternsChart = dynamic(
  () => import("@/components/performance/ErrorPatternsChart").then(m => ({ default: m.ErrorPatternsChart })),
  { loading: () => <div className="glass rounded-2xl h-48 animate-pulse" /> },
)
const ComparisonRadar = dynamic(
  () => import("@/components/performance/ComparisonRadar").then(m => ({ default: m.ComparisonRadar })),
  { loading: () => <div className="glass rounded-2xl h-64 animate-pulse" /> },
)
const SubjectDeepDive = dynamic(
  () => import("@/components/performance/SubjectDeepDive").then(m => ({ default: m.SubjectDeepDive })),
  { loading: () => <div className="glass rounded-2xl h-48 animate-pulse" /> },
)
const ProjectionSlider = dynamic(
  () => import("@/components/performance/ProjectionSlider").then(m => ({ default: m.ProjectionSlider })),
  { loading: () => <div className="glass rounded-2xl h-32 animate-pulse" /> },
)
const ProjecaoENEM = dynamic(
  () => import("@/components/performance/ProjecaoENEM").then(m => ({ default: m.ProjecaoENEM })),
  { loading: () => <div className="glass rounded-2xl h-48 animate-pulse" /> },
)
const TrendBadge = dynamic(
  () => import("@/components/performance/ProjecaoENEM").then(m => ({ default: m.TrendBadge })),
  { ssr: false },
)
const TriHistoryChart = dynamic(
  () => import("@/components/performance/TriHistoryChart").then(m => ({ default: m.TriHistoryChart })),
  { loading: () => <div className="glass rounded-2xl h-48 animate-pulse" /> },
)

// ── Types ──────────────────────────────────────────────────────────
interface OverviewData {
  hours_studied: number; questions_answered: number; accuracy_rate: number
  current_streak: number; exams_completed: number; topics_completed: number
  topics_total: number; plan_progress: number
}
interface ErrorPattern { type: string; description: string; count: number; percentage: number; color: string }
interface ErrorData { total_wrong: number; total_unanswered: number; patterns: ErrorPattern[] }
interface CompData { user_scores: Record<string, number>; national_avg: Record<string, number>; percentile: number }
interface SubjectPrediction { subject: string; subject_label: string; projected: number; confidence_low: number; confidence_high: number; trend: string }
interface PredictionData {
  projected_score: number | null; confidence_low: number | null; confidence_high: number | null
  by_subject: Record<string, SubjectPrediction>; data_points: number; has_enough_data: boolean; message: string | null
}
interface HistoryItem { exam_id: string; scheduled_exam_id: string; exam_type: string; completed_at: string; overall_tri: number | null; raw_score: number; tri_by_subject: Record<string, number> }
interface HistoryData { history: HistoryItem[]; data_points: number }

type Tab = "geral" | "analise" | "historico"
const TABS: { id: Tab; label: string }[] = [
  { id: "geral",    label: "Visão Geral" },
  { id: "analise",  label: "Análise"     },
  { id: "historico", label: "Histórico"  },
]

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb", matematica: "#10b981", cn: "#7c3aed", ch: "#f59e0b",
}

// ENEM 2026-11-02
const ENEM_MS = new Date("2026-11-02T08:00:00Z").getTime()
const daysRemaining = Math.max(0, Math.floor((ENEM_MS - Date.now()) / 86400000))

export default function DesempenhoPage() {
  const [tab, setTab]           = useState<Tab>("geral")
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [errors, setErrors]     = useState<ErrorData | null>(null)
  const [comp, setComp]         = useState<CompData | null>(null)
  const [pred, setPred]         = useState<PredictionData | null>(null)
  const [history, setHistory]   = useState<HistoryData | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/performance/overview"),
      api.get("/performance/error-patterns"),
      api.get("/performance/comparison"),
      api.get("/performance/enem-prediction"),
      api.get("/performance/tri-history"),
    ])
      .then(([ov, er, co, pr, hi]) => {
        setOverview(ov.data)
        setErrors(er.data)
        setComp(co.data)
        setPred(pr.data)
        setHistory(hi.data)
      })
      .catch(() => toast.error("Erro ao carregar dados de desempenho"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const currentHours = 2.0  // default — Stage 3+ will fetch from learning profile
  const hasPred = pred?.projected_score != null

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 size={22} className="text-secondary" />
          Desempenho
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Acompanhe sua evolução e projeção para o ENEM
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-sm rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ──────────────────────────────────────── */}
      {tab === "geral" && (
        <div className="space-y-5">
          {overview && <OverviewCards data={overview} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Projeção */}
            {hasPred && pred ? (
              <ProjecaoENEM
                projected={pred.projected_score!}
                confidenceLow={pred.confidence_low!}
                confidenceHigh={pred.confidence_high!}
                hasEnoughData={pred.has_enough_data}
                message={pred.message}
              />
            ) : (
              <div className="glass rounded-2xl p-5 flex items-center justify-center min-h-[220px]">
                <p className="text-sm text-muted-foreground text-center px-4">
                  {pred?.message ?? "Complete um simulado para ver a projeção de nota."}
                </p>
              </div>
            )}

            {/* Simulador de horas */}
            <ProjectionSlider
              currentHours={currentHours}
              baseProjection={pred?.projected_score ?? null}
              daysRemaining={daysRemaining}
            />
          </div>

          {/* Tendências por disciplina */}
          {hasPred && pred && Object.keys(pred.by_subject).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tendência por disciplina</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.values(pred.by_subject).map((s) => (
                  <TrendBadge
                    key={s.subject}
                    trend={s.trend}
                    score={s.projected}
                    label={s.subject_label}
                    color={SUBJECT_COLORS[s.subject] ?? "#94a3b8"}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Análise ──────────────────────────────────────────── */}
      {tab === "analise" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {errors && (
              <ErrorPatternsChart
                patterns={errors.patterns}
                totalWrong={errors.total_wrong}
              />
            )}
            {comp && (
              <ComparisonRadar
                userScores={comp.user_scores}
                nationalAvg={comp.national_avg}
                percentile={comp.percentile}
              />
            )}
          </div>
          <SubjectDeepDive />
        </div>
      )}

      {/* ── Histórico ────────────────────────────────────────── */}
      {tab === "historico" && (
        <div className="space-y-5">
          {history && <TriHistoryChart history={history.history} />}

          {history && history.history.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-medium">Histórico de simulados</p>
              </div>
              <div className="divide-y divide-border">
                {[...history.history].reverse().map((h, i) => (
                  <div key={h.exam_id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="text-muted-foreground w-5 shrink-0 text-xs">{i + 1}</span>
                    <span className="text-muted-foreground text-xs w-20 shrink-0">
                      {new Date(h.completed_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-muted-foreground text-xs flex-1 capitalize">
                      {h.exam_type === "complete" ? "Completo" : h.exam_type === "by_subject" ? "Por área" : "Quiz"}
                    </span>
                    <span className="text-muted-foreground text-xs">{h.raw_score}% bruto</span>
                    {h.overall_tri != null ? (
                      <span className="text-primary font-bold text-sm tabular-nums w-16 text-right">
                        {h.overall_tri} TRI
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs w-16 text-right">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <BarChart2 size={40} className="text-muted-foreground/25 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum simulado concluído ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
