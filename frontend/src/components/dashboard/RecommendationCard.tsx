"use client"

import { Sparkles, Play, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecommendationData {
  topic_id: string
  topic_name: string
  subject: string
  subject_label: string
  hours_allocated: number
  priority: string
  type: string
}

interface Props {
  recommendation: RecommendationData | null
  onStart: () => void
}

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb",
  matematica: "#10b981",
  cn: "#7c3aed",
  ch: "#f59e0b",
  redacao: "#ef4444",
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const TYPE_LABELS: Record<string, string> = {
  theory: "Teoria",
  practice: "Prática",
  review: "Revisão",
}

export function RecommendationCard({ recommendation, onStart }: Props) {
  if (!recommendation) {
    return (
      <div className="glass rounded-2xl p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-brand-violet shrink-0" />
          <p className="text-sm font-medium text-muted-foreground">Recomendação IA</p>
        </div>
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground text-center">
            Gere um plano de estudos para receber recomendações.
          </p>
        </div>
      </div>
    )
  }

  const color = SUBJECT_COLORS[recommendation.subject] ?? "#2563eb"

  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col"
      style={{ borderColor: `${color}22` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} style={{ color }} className="shrink-0" />
        <p className="text-sm font-medium text-muted-foreground">Recomendação IA</p>
      </div>

      <div className="flex-1">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${color}18` }}
          >
            <BookOpen size={18} style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-snug line-clamp-2">
              {recommendation.topic_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{recommendation.subject_label}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {TYPE_LABELS[recommendation.type] ?? recommendation.type}
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${color}18`, color }}
              >
                {PRIORITY_LABELS[recommendation.priority] ?? recommendation.priority}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {recommendation.hours_allocated}h
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button
        className="w-full mt-4 gap-2 text-white hover:opacity-90 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        onClick={onStart}
      >
        <Play size={14} />
        Iniciar Agora
      </Button>
    </div>
  )
}
