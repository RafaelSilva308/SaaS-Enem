"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Minus, ArrowLeft, Loader2, Share2 } from "lucide-react"
import { motion } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Option { letter: string; text: string }
interface AnswerDetail {
  question_id: string; subject: string; subject_label: string; topic: string | null
  difficulty: string | null; user_answer: string | null; correct_answer: string
  is_correct: boolean | null; statement_preview: string; options: Option[]
}
interface SubjectPerf {
  subject: string; subject_label: string; total: number
  correct: number; wrong: number; unanswered: number; percentage: number
  tri_score: number | null
}
interface ResultData {
  exam_type: string; subject: string | null; total_questions: number
  correct_answers: number; wrong_answers: number; unanswered: number
  raw_score: number; score_estimate: number | null; completed_at: string
  duration_actual_minutes: number; performance_by_subject: SubjectPerf[]
  answers: AnswerDetail[]
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(duration / target) || 20
    const interval = setInterval(() => {
      start += 2
      if (start >= target) { setVal(target); clearInterval(interval) }
      else setVal(start)
    }, step)
    return () => clearInterval(interval)
  }, [target, duration])
  return val
}

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb",
  matematica: "#10b981",
  cn: "#7c3aed",
  ch: "#f59e0b",
}

export default function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    api.get(`/exams/scheduled/${id}/result`)
      .then(({ data: res }) => setData(res))
      .catch(() => toast.error("Erro ao carregar resultado"))
      .finally(() => setLoading(false))
  }, [id])

  const score = useCountUp(data?.raw_score ?? 0)

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const scoreColor = data.raw_score >= 70 ? "#10b981" : data.raw_score >= 50 ? "#f59e0b" : "#ef4444"

  const chartData = data.performance_by_subject.map((p) => ({
    name: p.subject_label,
    subject: p.subject,
    Corretas: p.correct,
    Erradas: p.wrong,
    "S/ resp.": p.unanswered,
  }))

  const handleShare = async () => {
    const text = `Acertei ${data.raw_score}% no simulado ENEM Pro! 🎯`
    if (navigator.share) {
      await navigator.share({ title: "Meu resultado — ENEM Pro", text, url: window.location.href })
        .catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`)
        .then(() => toast.success("Link copiado!"))
        .catch(() => {})
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/simulados")}>
          <ArrowLeft size={16} className="mr-1" /> Simulados
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
          <Share2 size={14} /> Compartilhar
        </Button>
      </div>

      {/* Score reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6"
        style={{ borderColor: `${scoreColor}25` }}
      >
        <div className="flex items-center justify-around gap-6 flex-wrap">
          {/* Score bruto */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Acertos</p>
            <div className="text-6xl font-bold tabular-nums" style={{ color: scoreColor }}>
              {score}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.correct_answers}/{data.total_questions} corretas
            </p>
          </div>

          {/* Separador */}
          <div className="w-px h-16 bg-border hidden sm:block" />

          {/* Score TRI */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Estimativa TRI
            </p>
            {data.score_estimate != null ? (
              <>
                <div className="text-6xl font-bold tabular-nums text-primary">
                  {data.score_estimate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">escala 200–1000</p>
              </>
            ) : (
              <div className="text-2xl text-muted-foreground/40 mt-2">—</div>
            )}
          </div>
        </div>

        <div className="border-t border-border mt-5 pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>{data.correct_answers} corretas</span>
          <span>·</span>
          <span>{data.wrong_answers} erradas</span>
          <span>·</span>
          <span>{data.unanswered} sem resposta</span>
          <span>·</span>
          <span>{data.duration_actual_minutes} min</span>
        </div>
      </motion.div>

      {/* TRI por disciplina */}
      {data.performance_by_subject.some((p) => p.tri_score != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.performance_by_subject
            .filter((p) => p.tri_score != null)
            .map((p) => {
              const color = SUBJECT_COLORS[p.subject] ?? "#94a3b8"
              return (
                <div
                  key={p.subject}
                  className="glass-sm rounded-xl p-3 text-center"
                  style={{ borderColor: `${color}20` }}
                >
                  <p className="text-[11px] text-muted-foreground truncate">{p.subject_label}</p>
                  <p className="text-xl font-bold mt-0.5" style={{ color }}>{p.tri_score}</p>
                  <p className="text-[11px] text-muted-foreground">{p.percentage}% acertos</p>
                </div>
              )
            })}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">Desempenho por Área</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickCount={4} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 8 }}
                labelStyle={{ color: "#f8fafc" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar dataKey="Corretas" radius={[4, 4, 0, 0]} fill="#10b981" />
              <Bar dataKey="Erradas" radius={[4, 4, 0, 0]} fill="#ef4444" />
              <Bar dataKey="S/ resp." radius={[4, 4, 0, 0]} fill="#334155" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Answers review */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-medium">Revisão das questões</p>
        </div>
        <div className="divide-y divide-border">
          {data.answers.map((a, i) => (
            <div key={a.question_id}>
              <button
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              >
                <span className="shrink-0">
                  {a.is_correct === true && <CheckCircle size={16} className="text-secondary" />}
                  {a.is_correct === false && <XCircle size={16} className="text-destructive" />}
                  {a.is_correct === null && <Minus size={16} className="text-muted-foreground" />}
                </span>
                <span className="text-xs font-medium w-6 text-muted-foreground shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-left line-clamp-1">{a.statement_preview}</span>
                <span className="text-xs text-muted-foreground shrink-0">{a.subject_label}</span>
              </button>

              {expandedIndex === i && (
                <div className="px-5 pb-4 space-y-3 bg-muted/10">
                  <p className="text-sm leading-relaxed">{a.statement_preview}</p>
                  <div className="space-y-1.5">
                    {a.options.map((opt) => (
                      <div
                        key={opt.letter}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-lg text-sm",
                          opt.letter === a.correct_answer && "bg-secondary/15 text-secondary",
                          opt.letter === a.user_answer && opt.letter !== a.correct_answer && "bg-destructive/15 text-destructive",
                          opt.letter !== a.correct_answer && opt.letter !== a.user_answer && "text-muted-foreground",
                        )}
                      >
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                  {a.user_answer ? (
                    <p className="text-xs text-muted-foreground">
                      Sua resposta: <strong>{a.user_answer}</strong> · Correta: <strong>{a.correct_answer}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Não respondida · Correta: <strong>{a.correct_answer}</strong></p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
