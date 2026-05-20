"use client"

interface HeatmapDay {
  date: string
  hours: number
  intensity: number  // 0–4
}

interface Props {
  heatmap: HeatmapDay[]
}

const INTENSITY_COLORS = [
  "bg-muted/30",                    // 0 — sem estudo
  "bg-primary/25",                  // 1 — < 1h
  "bg-primary/50",                  // 2 — 1–2h
  "bg-primary/75",                  // 3 — 2–3h
  "bg-primary",                     // 4 — 3h+
]

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function StreakHeatmap({ heatmap }: Props) {
  if (!heatmap.length) return null

  // Agrupar em semanas (linhas) com 7 dias cada
  const weeks: HeatmapDay[][] = []
  let week: HeatmapDay[] = []

  for (const day of heatmap) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) weeks.push(week)

  const today = new Date().toISOString().slice(0, 10)
  const totalHours = heatmap.reduce((s, d) => s + d.hours, 0)
  const studyDays = heatmap.filter((d) => d.intensity > 0).length

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted-foreground">Atividade (12 semanas)</p>
        <p className="text-xs text-muted-foreground">
          {studyDays} dias · {totalHours.toFixed(0)}h estudadas
        </p>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {w.map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm transition-colors ${INTENSITY_COLORS[day.intensity]} ${day.date === today ? "ring-1 ring-primary" : ""}`}
                  title={`${day.date}: ${day.hours.toFixed(1)}h`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${INTENSITY_COLORS[i]}`} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  )
}
