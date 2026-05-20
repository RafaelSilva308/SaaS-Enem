"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Props {
  number: number        // 1–5
  label: string
  score: number         // 0–200
  maxScore?: number
  feedback?: string | null
  color: string
  delay?: number
}

const SCORE_LABELS: Record<number, string> = {
  0:   "Fuga ao tema / anulada",
  40:  "Insuficiente",
  80:  "Regular",
  120: "Bom",
  160: "Muito bom",
  200: "Excelente",
}

export function CompetencyBar({
  number, label, score, maxScore = 200, feedback, color, delay = 0,
}: Props) {
  const pct = Math.round((score / maxScore) * 100)
  const qualitative = SCORE_LABELS[score] ?? `${score} pts`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-white"
            style={{ background: color }}
          >
            C{number}
          </span>
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">{qualitative}</span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>

      {feedback && (
        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
          {feedback}
        </p>
      )}
    </div>
  )
}
