"use client"

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, Tooltip, ResponsiveContainer,
} from "recharts"

interface Props {
  userScores: Record<string, number>
  nationalAvg: Record<string, number>
  percentile: number
}

const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens",
  matematica: "Matemática",
  cn:         "Ciências Nat.",
  ch:         "Ciências Hum.",
}

const CustomTooltip = ({
  active, payload,
}: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm rounded-lg px-3 py-2 text-xs shadow-xl space-y-1">
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

export function ComparisonRadar({ userScores, nationalAvg, percentile }: Props) {
  const subjects = Object.keys(SUBJECT_LABELS).filter((s) => s in userScores || s in nationalAvg)

  const data = subjects.map((s) => ({
    subject: SUBJECT_LABELS[s] ?? s,
    Você:    userScores[s]  ?? 0,
    Média:   nationalAvg[s] ?? 0,
  }))

  const percentileColor =
    percentile >= 70 ? "#10b981" :
    percentile >= 40 ? "#f59e0b" : "#ef4444"

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">Comparação Nacional</p>
        <div className="text-right">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: percentileColor }}
          >
            Top {100 - percentile}%
          </span>
          <p className="text-[11px] text-muted-foreground">Percentil {percentile}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="rgba(148,163,184,0.15)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 9 }}
            tickCount={4}
          />
          <Radar
            name="Você"
            dataKey="Você"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={{ r: 3, fill: "#2563eb" }}
          />
          <Radar
            name="Média nacional"
            dataKey="Média"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.10}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-muted-foreground text-center mt-1">
        Médias nacionais baseadas em dados INEP 2021–2023
      </p>
    </div>
  )
}
