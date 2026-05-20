"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"

interface HistoryItem {
  completed_at: string
  overall_tri: number | null
  tri_by_subject: Record<string, number>
}

interface Props {
  history: HistoryItem[]
}

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb",
  matematica: "#10b981",
  cn:         "#7c3aed",
  ch:         "#f59e0b",
}

const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens",
  matematica: "Matemática",
  cn:         "Ciências da Natureza",
  ch:         "Ciências Humanas",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`
}

export function TriHistoryChart({ history }: Props) {
  if (!history.length) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-muted-foreground text-center">
          Complete simulados para ver sua evolução TRI.
        </p>
      </div>
    )
  }

  // Descobrir quais disciplinas aparecem no histórico
  const subjects = Array.from(
    new Set(history.flatMap((h) => Object.keys(h.tri_by_subject)))
  ).filter((s) => s in SUBJECT_LABELS)

  const chartData = history.map((h) => ({
    date: formatDate(h.completed_at),
    Geral: h.overall_tri,
    ...Object.fromEntries(
      subjects.map((s) => [SUBJECT_LABELS[s] ?? s, h.tri_by_subject[s] ?? null])
    ),
  }))

  const CustomTooltip = ({
    active, payload, label,
  }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-sm rounded-lg px-3 py-2 text-xs shadow-xl space-y-1">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">Evolução do Score TRI</p>
        <p className="text-xs text-muted-foreground">{history.length} simulado{history.length !== 1 ? "s" : ""}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            domain={[200, 1000]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickCount={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
          />

          {/* Linha de referência na média (500) */}
          <ReferenceLine
            y={500}
            stroke="rgba(148,163,184,0.2)"
            strokeDasharray="4 4"
            label={{ value: "500", position: "right", fontSize: 10, fill: "#64748b" }}
          />

          {/* Linha geral */}
          <Line
            type="monotone"
            dataKey="Geral"
            stroke="#ffffff"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#ffffff" }}
            activeDot={{ r: 6 }}
            connectNulls
          />

          {/* Linhas por disciplina */}
          {subjects.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={SUBJECT_LABELS[s] ?? s}
              stroke={SUBJECT_COLORS[s] ?? "#94a3b8"}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: SUBJECT_COLORS[s] ?? "#94a3b8" }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
