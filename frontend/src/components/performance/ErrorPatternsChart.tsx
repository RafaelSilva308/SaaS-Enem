"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ErrorPatternFixed {
  type: string
  description: string
  count: number
  percentage: number
  color: string
}

interface Props {
  patterns: ErrorPatternFixed[]
  totalWrong: number
}

const CustomTooltip = ({
  active, payload,
}: { active?: boolean; payload?: Array<{ payload: ErrorPatternFixed }> }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass-sm rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="font-medium" style={{ color: d.color }}>{d.type}</p>
      <p className="text-muted-foreground">{d.description}</p>
      <p className="font-bold">{d.count} erro{d.count !== 1 ? "s" : ""} ({d.percentage}%)</p>
    </div>
  )
}

export function ErrorPatternsChart({ patterns, totalWrong }: Props) {
  if (!patterns.length) {
    return (
      <div className="glass rounded-2xl p-5 flex flex-col">
        <p className="text-sm font-medium text-muted-foreground mb-4">Padrões de Erro</p>
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum dado ainda. Responda questões ou faça simulados para ver seus padrões de erro.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">Padrões de Erro</p>
        <p className="text-xs text-muted-foreground">{totalWrong} erros no total</p>
      </div>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={patterns}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              dataKey="count"
              paddingAngle={2}
            >
              {patterns.map((p, i) => (
                <Cell key={i} fill={p.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2 w-full">
          {patterns.map((p) => (
            <div key={p.type} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium">{p.type}</p>
                  <p className="text-xs text-muted-foreground">{p.count} ({p.percentage}%)</p>
                </div>
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.percentage}%`, background: p.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1">
        {patterns.map((p) => (
          <p key={p.type} className="text-[11px] text-muted-foreground">
            <span className="font-medium" style={{ color: p.color }}>{p.type}:</span>{" "}
            {p.description}
          </p>
        ))}
      </div>
    </div>
  )
}
