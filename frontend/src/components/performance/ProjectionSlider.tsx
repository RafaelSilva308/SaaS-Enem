"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface Props {
  currentHours: number
  baseProjection: number | null
  daysRemaining: number
}

// Ganho estimado de TRI por hora adicional de estudo diário
// considerando o período até o ENEM
const TRI_PER_EXTRA_HOUR = 15

function scoreColor(score: number): string {
  if (score >= 750) return "#2563eb"
  if (score >= 600) return "#10b981"
  if (score >= 450) return "#f59e0b"
  return "#ef4444"
}

function scoreLabel(score: number): string {
  if (score >= 750) return "Excelente"
  if (score >= 600) return "Bom"
  if (score >= 450) return "Regular"
  return "Insuficiente"
}

export function ProjectionSlider({ currentHours, baseProjection, daysRemaining }: Props) {
  const [hours, setHours] = useState(currentHours)

  const base  = baseProjection ?? 500
  const delta = Math.round((hours - currentHours) * TRI_PER_EXTRA_HOUR)
  const projected = Math.max(200, Math.min(1000, base + delta))
  const color = scoreColor(projected)

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted-foreground">Simulador de Estudo</p>
        <p className="text-xs text-muted-foreground">{daysRemaining} dias até o ENEM</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Se eu estudar <strong className="text-foreground">{hours}h/dia</strong>, minha projeção seria:
      </p>

      <div className="text-center py-2">
        <p className="text-5xl font-bold tabular-nums" style={{ color }}>
          {projected}
        </p>
        <p className="text-sm mt-1" style={{ color }}>{scoreLabel(projected)}</p>
        {delta !== 0 && (
          <p className={cn("text-xs mt-0.5", delta > 0 ? "text-secondary" : "text-destructive")}>
            {delta > 0 ? "+" : ""}{delta} pts vs. projeção atual
          </p>
        )}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <Slider
          min={0.5}
          max={8}
          step={0.5}
          value={[hours]}
          onValueChange={(v) => {
            const val = Array.isArray(v) ? v[0] : v
            setHours(typeof val === "number" ? val : currentHours)
          }}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>0.5h</span>
          <span>{hours}h/dia</span>
          <span>8h</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/60">
        Estimativa baseada no seu ritmo atual e no tempo restante.
        Aproximação — resultados reais variam.
      </p>
    </div>
  )
}
