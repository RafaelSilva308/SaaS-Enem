"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, LineChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { BookOpen, Crown, Lock, Loader2, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────
interface HistoricalYear { year: number; linguagens: number; matematica: number; cn: number; ch: number }
interface ENEMHistorical { user_scores: Record<string, number | null>; historical: HistoricalYear[]; has_user_data: boolean }
interface TopicItem { name: string; frequency: number; priority: string }
interface TopicFrequency { subjects: Record<string, TopicItem[]> }
interface CohortBucket { label: string; count: number; range_start: number; range_end: number }
interface CohortData { distribution: CohortBucket[]; user_score: number | null; percentile: number | null; total_users: number; has_user_data: boolean }
interface ProbableTopic { name: string; priority: string; frequency: number }
interface ProbableTopics { subjects: Record<string, ProbableTopic[]> }

// ── Constants ──────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb", matematica: "#10b981", cn: "#7c3aed", ch: "#f59e0b",
}
const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens", matematica: "Matemática", cn: "Ciências da Natureza", ch: "Ciências Humanas",
}
const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-500", high: "bg-amber-500", medium: "bg-blue-500", low: "bg-muted",
}
const SUBJECTS = ["linguagens", "matematica", "cn", "ch"]

// ── Paywall ────────────────────────────────────────────────────────
function PremiumGate() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center">
        <Lock size={28} className="text-amber-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Funcionalidade Premium</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          A Análise Comparativa está disponível para assinantes dos planos Premium.
          Veja como você se compara com as médias do ENEM e com outros estudantes.
        </p>
      </div>
      <Button
        onClick={() => router.push("/app/configuracoes/billing")}
        className="gradient-brand hover:opacity-90 font-semibold gap-2 px-6"
      >
        <Crown size={14} />
        Assinar Premium
      </Button>
    </div>
  )
}

// ── Historical chart ───────────────────────────────────────────────
function HistoricalSection({ data }: { data: ENEMHistorical }) {
  // Montar dados: anos históricos + "Você" ao final
  const chartData = data.historical.map(row => ({
    name: String(row.year),
    linguagens: row.linguagens,
    matematica: row.matematica,
    cn: row.cn,
    ch: row.ch,
    isUser: false,
  }))

  if (data.has_user_data) {
    chartData.push({
      name: "Você",
      linguagens: data.user_scores.linguagens ?? 0,
      matematica: data.user_scores.matematica ?? 0,
      cn: data.user_scores.cn ?? 0,
      ch: data.user_scores.ch ?? 0,
      isUser: true,
    })
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold mb-1">Notas por Área vs Médias Nacionais ENEM</p>
      <p className="text-xs text-muted-foreground mb-4">
        Comparação das médias históricas por disciplina (2019–2024){data.has_user_data ? " e seus scores TRI" : ""}
      </p>
      {!data.has_user_data && (
        <p className="text-xs text-amber-400 mb-3">
          Complete ao menos um simulado para ver seus scores comparados.
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barGap={2} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis domain={[400, 750]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
            labelStyle={{ color: "#f1f5f9", fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => SUBJECT_LABELS[value] ?? value}
          />
          {SUBJECTS.map(s => (
            <Bar key={s} dataKey={s} fill={SUBJECT_COLORS[s]} radius={[3, 3, 0, 0]} maxBarSize={18} name={s}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={SUBJECT_COLORS[s]}
                  opacity={entry.isUser ? 1 : 0.55}
                  stroke={entry.isUser ? SUBJECT_COLORS[s] : "none"}
                  strokeWidth={entry.isUser ? 2 : 0}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Cohort chart ───────────────────────────────────────────────────
function CohortSection({ data }: { data: CohortData }) {
  const maxCount = Math.max(...data.distribution.map(d => d.count), 1)

  // Encontrar qual bucket contém o score do usuário para highlight
  const userBucket = data.user_score !== null
    ? data.distribution.find(b => data.user_score! >= b.range_start && data.user_score! < b.range_end)?.label
    : null

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold">Distribuição de Scores na Plataforma</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.total_users} {data.total_users === 1 ? "estudante" : "estudantes"} com simulado realizado
          </p>
        </div>
        {data.has_user_data && data.percentile !== null && (
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-primary">{data.percentile}°</p>
            <p className="text-[11px] text-muted-foreground">percentil</p>
          </div>
        )}
      </div>

      {data.total_users === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ainda não há dados de coorte disponíveis.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.distribution} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              formatter={(val) => [val, "Estudantes"]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Estudantes">
              {data.distribution.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.label === userBucket ? "#2563eb" : "#334155"}
                  opacity={entry.label === userBucket ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {data.has_user_data && data.user_score !== null && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Seu score mais recente: <span className="text-primary font-semibold">{data.user_score}</span>
          {data.percentile !== null && (
            <> · melhor que <span className="text-foreground font-medium">{data.percentile}%</span> dos estudantes</>
          )}
        </p>
      )}
      {!data.has_user_data && (
        <p className="text-xs text-amber-400 mt-3 text-center">
          Complete ao menos um simulado para ver sua posição.
        </p>
      )}
    </div>
  )
}

// ── Topic frequency ────────────────────────────────────────────────
function TopicFrequencySection({ data }: { data: TopicFrequency }) {
  const [openSubject, setOpenSubject] = useState("linguagens")

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold mb-1">Frequência Histórica de Tópicos</p>
      <p className="text-xs text-muted-foreground mb-4">
        Com que frequência cada tópico apareceu nas edições do ENEM (2010–2024)
      </p>

      {/* Subject tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-4 flex-wrap">
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setOpenSubject(s)}
            className={cn(
              "flex-1 min-w-[80px] py-1.5 rounded-lg text-xs font-medium transition-colors",
              openSubject === s ? "text-white" : "text-muted-foreground hover:text-foreground",
            )}
            style={openSubject === s ? { background: SUBJECT_COLORS[s] } : {}}
          >
            {SUBJECT_LABELS[s].split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {(data.subjects[openSubject] ?? []).map(topic => (
          <div key={topic.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium truncate flex-1 mr-3">{topic.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{topic.frequency}%</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${topic.frequency}%`,
                  backgroundColor: SUBJECT_COLORS[openSubject],
                  opacity: topic.priority === "critical" ? 1 : topic.priority === "high" ? 0.75 : 0.5,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
        {[["critical", "Muito frequente"], ["high", "Frequente"], ["medium", "Moderado"], ["low", "Raro"]].map(([p, label]) => (
          <div key={p} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", PRIORITY_COLOR[p])} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Probable topics ────────────────────────────────────────────────
function ProbableTopicsSection({ data }: { data: ProbableTopics }) {
  const router = useRouter()

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold">Tópicos Mais Prováveis — ENEM 2026</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Baseado na frequência histórica e no peso TRI
          </p>
        </div>
        <TrendingUp size={16} className="text-primary shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBJECTS.map(subj => {
          const topics = data.subjects[subj] ?? []
          return (
            <div key={subj}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SUBJECT_COLORS[subj] }} />
                <p className="text-xs font-semibold">{SUBJECT_LABELS[subj]}</p>
              </div>
              <div className="space-y-1.5">
                {topics.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-xl">
                    <span className="text-[11px] text-muted-foreground font-bold w-4 shrink-0">{i + 1}.</span>
                    <span className="text-xs flex-1 leading-tight">{t.name}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                      t.priority === "critical" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400",
                    )}>
                      {t.frequency}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/app/plano")}
        className="mt-4 w-full gap-2 text-xs"
      >
        <BookOpen size={13} />
        Ver no Plano de Estudos
      </Button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function AnáliseComparativaPage() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [historical, setHistorical] = useState<ENEMHistorical | null>(null)
  const [frequency, setFrequency] = useState<TopicFrequency | null>(null)
  const [cohort, setCohort] = useState<CohortData | null>(null)
  const [probable, setProbable] = useState<ProbableTopics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [h, f, c, p] = await Promise.all([
          api.get("/analysis/enem-historical"),
          api.get("/analysis/topic-frequency"),
          api.get("/analysis/cohort-comparison"),
          api.get("/analysis/probable-topics"),
        ])
        setHistorical(h.data)
        setFrequency(f.data)
        setCohort(c.data)
        setProbable(p.data)
        setIsPremium(true)
      } catch (err: any) {
        if (err.response?.status === 402) {
          setIsPremium(false)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (isPremium === false) return <PremiumGate />

  if (!historical || !frequency || !cohort || !probable) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Análise Comparativa</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compare seu desempenho com as médias históricas do ENEM e com outros estudantes da plataforma.
        </p>
      </div>

      <HistoricalSection data={historical} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CohortSection data={cohort} />
        <TopicFrequencySection data={frequency} />
      </div>

      <ProbableTopicsSection data={probable} />
    </div>
  )
}
