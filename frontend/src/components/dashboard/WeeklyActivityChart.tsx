"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

interface WeeklyActivityItem {
  date: string
  day_label: string
  hours: number
  is_today: boolean
}

interface Props {
  activity: WeeklyActivityItem[]
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-primary">{payload[0].value.toFixed(1)}h estudadas</p>
    </div>
  )
}

export function WeeklyActivityChart({ activity }: Props) {
  const totalHours = activity.reduce((sum, d) => sum + d.hours, 0)

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Atividade Semanal</p>
          <p className="text-xl font-bold mt-0.5">
            {totalHours.toFixed(1)}h
            <span className="text-sm font-normal text-muted-foreground ml-1.5">nos últimos 7 dias</span>
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={activity} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="day_label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12, fontFamily: "Outfit, sans-serif" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit, sans-serif" }}
            tickCount={4}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="hours" radius={[5, 5, 0, 0]}>
            {activity.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={entry.is_today ? "#2563eb" : entry.hours > 0 ? "#1d4ed8" : "#1e293b"}
                opacity={entry.is_today ? 1 : entry.hours > 0 ? 0.65 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
