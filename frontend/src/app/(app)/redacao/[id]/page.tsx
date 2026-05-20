"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { CompetencyBar } from "@/components/essays/CompetencyBar"

interface GrammarError { line: number; excerpt: string; correction: string; type: string }
interface Analysis {
  ai_score: number
  competency1_score: number; competency2_score: number; competency3_score: number
  competency4_score: number; competency5_score: number
  structural_feedback: string | null; argument_feedback: string | null; language_feedback: string | null
  grammar_errors: GrammarError[]; suggestions: string[]
}
interface EssayData {
  id: string; theme_title: string | null; text: string; word_count: number | null
  line_count: number | null; status: string; submitted_at: string | null; analysis: Analysis | null
}

const COMPETENCIES = [
  { key: "competency1_score" as const, label: "Domínio da norma culta", color: "#2563eb", feedbackKey: "structural_feedback" as const },
  { key: "competency2_score" as const, label: "Compreensão da proposta", color: "#10b981", feedbackKey: "argument_feedback" as const },
  { key: "competency3_score" as const, label: "Seleção e organização de informações", color: "#7c3aed", feedbackKey: "structural_feedback" as const },
  { key: "competency4_score" as const, label: "Mecanismos linguísticos", color: "#f59e0b", feedbackKey: "language_feedback" as const },
  { key: "competency5_score" as const, label: "Proposta de intervenção", color: "#ef4444", feedbackKey: "argument_feedback" as const },
]

function useCountUp(target: number, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let current = 0
      const step = Math.max(1, Math.floor(target / 60))
      const iv = setInterval(() => {
        current = Math.min(target, current + step)
        setVal(current)
        if (current >= target) clearInterval(iv)
      }, 25)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay])
  return val
}

function scoreColor(score: number) {
  if (score >= 800) return "#2563eb"
  if (score >= 600) return "#10b981"
  if (score >= 400) return "#f59e0b"
  return "#ef4444"
}

function scoreLabel(score: number) {
  if (score >= 800) return "Excelente"
  if (score >= 600) return "Bom"
  if (score >= 400) return "Regular"
  return "Insuficiente"
}

const POLL_INTERVAL = 3000

export default function EssayResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router   = useRouter()
  const [data, setData]     = useState<EssayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showText, setShowText] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEssay = async () => {
    const { data: res } = await api.get(`/essays/${id}`)
    setData(res)
    if (res.status === "reviewed") {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return res
  }

  useEffect(() => {
    fetchEssay()
      .catch(() => { toast.error("Redação não encontrada"); router.push("/app/redacao") })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!data) return
    if (data.status === "under_review") {
      pollRef.current = setInterval(async () => {
        try { await fetchEssay() } catch { /* ignore */ }
      }, POLL_INTERVAL)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.status])

  const score = useCountUp(data?.analysis?.ai_score ?? 0, 300)

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  // Still processing
  if (data.status !== "reviewed" || !data.analysis) {
    return (
      <div className="max-w-2xl space-y-5">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/redacao")}>
          <ArrowLeft size={15} className="mr-1" /> Minhas Redações
        </Button>
        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <RefreshCw size={36} className="text-primary animate-spin mx-auto" />
          <p className="font-semibold text-lg">Analisando sua redação…</p>
          <p className="text-sm text-muted-foreground">
            A IA está avaliando as 5 competências. Isso leva alguns segundos.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Esta página atualiza automaticamente.
          </p>
        </div>
      </div>
    )
  }

  const { analysis } = data
  const color = scoreColor(analysis.ai_score)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/redacao")}>
          <ArrowLeft size={15} className="mr-1" /> Minhas Redações
        </Button>
      </div>

      {/* Score reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 text-center"
        style={{ borderColor: `${color}25` }}
      >
        <p className="text-sm text-muted-foreground mb-2">{data.theme_title ?? "Redação"}</p>
        <p className="text-7xl font-bold tabular-nums" style={{ color }}>{score}</p>
        <p className="text-sm mt-1" style={{ color }}>{scoreLabel(analysis.ai_score)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Escala 0–1000 · {data.word_count} palavras · {data.line_count} linhas
        </p>
      </motion.div>

      {/* Competency bars */}
      <div className="glass rounded-2xl p-5 space-y-5">
        <p className="text-sm font-medium text-muted-foreground">Desempenho por competência</p>
        {COMPETENCIES.map((c, i) => (
          <CompetencyBar
            key={c.key}
            number={i + 1}
            label={c.label}
            score={analysis[c.key]}
            color={c.color}
            delay={0.1 * (i + 1)}
          />
        ))}
      </div>

      {/* Feedbacks */}
      {(analysis.structural_feedback || analysis.argument_feedback || analysis.language_feedback) && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Análise detalhada</p>
          {[
            { label: "Estrutura e norma culta (C1, C3)", text: analysis.structural_feedback, color: "#2563eb" },
            { label: "Argumentação e intervenção (C2, C5)", text: analysis.argument_feedback, color: "#10b981" },
            { label: "Mecanismos linguísticos (C4)", text: analysis.language_feedback, color: "#f59e0b" },
          ].filter((f) => f.text).map((f) => (
            <div key={f.label}>
              <p className="text-xs font-semibold mb-1" style={{ color: f.color }}>{f.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grammar errors */}
      {analysis.grammar_errors.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Erros identificados ({analysis.grammar_errors.length})
          </p>
          {analysis.grammar_errors.map((e, i) => (
            <div key={i} className="glass-sm rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                  {e.type}
                </span>
                {e.line > 0 && (
                  <span className="text-[11px] text-muted-foreground">linha {e.line}</span>
                )}
              </div>
              <p className="text-sm text-destructive/80 line-through">{e.excerpt}</p>
              <p className="text-sm text-secondary">→ {e.correction}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Sugestões para próxima redação
          </p>
          {analysis.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Essay text toggle */}
      <div className="glass rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-muted/20 transition-colors"
          onClick={() => setShowText((v) => !v)}
        >
          <span>Ver texto original</span>
          <span className="text-muted-foreground text-xs">{showText ? "▲" : "▼"}</span>
        </button>
        {showText && (
          <div className="px-5 pb-5 border-t border-border">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground pt-4">
              {data.text}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
