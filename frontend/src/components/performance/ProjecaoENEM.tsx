"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
  projected: number
  confidenceLow: number
  confidenceHigh: number
  hasEnoughData: boolean
  message?: string | null
}

// ── Geometria do gauge ─────────────────────────────────────────────
const VW = 280
const VH = 168
const CX = 140   // centro x
const CY = 148   // centro y  (base do semicírculo)
const R  = 112   // raio do arco colorido
const SW = 20    // espessura do arco

const ZONES = [
  { from: 200, to: 400, color: "#ef4444", label: "Insuf." },
  { from: 400, to: 600, color: "#f59e0b", label: "Regular" },
  { from: 600, to: 800, color: "#10b981", label: "Bom" },
  { from: 800, to: 1000, color: "#2563eb", label: "Ótimo" },
]

function toAngleDeg(score: number): number {
  // score 200 → 180°, score 1000 → 0°
  const clamped = Math.max(200, Math.min(1000, score))
  return (1 - (clamped - 200) / 800) * 180
}

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

function arcD(r: number, fromScore: number, toScore: number): string {
  const s = polar(toAngleDeg(fromScore), r)
  const e = polar(toAngleDeg(toScore), r)
  // Arco pequeno (<180°) antihorário (sweep=0) da esq para dir pelo topo
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function zoneColor(score: number): string {
  for (const z of ZONES) {
    if (score >= z.from && score <= z.to) return z.color
  }
  return "#2563eb"
}

export function ProjecaoENEM({
  projected,
  confidenceLow,
  confidenceHigh,
  hasEnoughData,
  message,
}: Props) {
  const needleAngle  = toAngleDeg(projected)
  const tip          = polar(needleAngle, R - 6)
  const baseL        = polar(needleAngle + 90, 7)
  const baseR_       = polar(needleAngle - 90, 7)
  const color        = zoneColor(projected)

  return (
    <div className="glass rounded-2xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Projeção para o ENEM</p>
        {!hasEnoughData && (
          <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            Dados limitados
          </span>
        )}
      </div>

      {/* SVG Gauge */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full max-w-[280px] mx-auto block"
        aria-label={`Projeção ENEM: ${projected} pontos`}
      >
        {/* Arcos de zona (fundo, pouco opaco) */}
        {ZONES.map((z) => (
          <path
            key={z.from}
            d={arcD(R, z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth={SW}
            strokeLinecap="butt"
            opacity={0.18}
          />
        ))}

        {/* Arco de intervalo de confiança */}
        <path
          d={arcD(R, confidenceLow, confidenceHigh)}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          opacity={0.40}
        />

        {/* Arco de destaque na zona atual */}
        {(() => {
          const zone = ZONES.find((z) => projected >= z.from && projected <= z.to) ?? ZONES[2]
          return (
            <path
              d={arcD(R, zone.from, zone.to)}
              fill="none"
              stroke={zone.color}
              strokeWidth={SW}
              strokeLinecap="butt"
              opacity={0.30}
            />
          )
        })()}

        {/* Marcas de score a cada 200 pts */}
        {[200, 400, 600, 800, 1000].map((s) => {
          const p = polar(toAngleDeg(s), R + SW / 2 + 8)
          return (
            <text
              key={s}
              x={p.x}
              y={p.y + 4}
              fontSize={9}
              fill="#64748b"
              textAnchor="middle"
            >
              {s}
            </text>
          )
        })}

        {/* Agulha */}
        <motion.path
          d={`M ${baseL.x.toFixed(2)} ${baseL.y.toFixed(2)} L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${baseR_.x.toFixed(2)} ${baseR_.y.toFixed(2)} Z`}
          fill="white"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        />

        {/* Pivô central */}
        <circle cx={CX} cy={CY} r={7} fill="white" opacity={0.9} />
        <circle cx={CX} cy={CY} r={3} fill={color} />
      </svg>

      {/* Score + IC */}
      <div className="text-center -mt-4">
        <motion.p
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {projected}
        </motion.p>
        <p className="text-xs text-muted-foreground mt-0.5">
          IC 90%: {confidenceLow} – {confidenceHigh} pts
        </p>
        {message && (
          <p className="text-[11px] text-amber-400 mt-1">{message}</p>
        )}
      </div>
    </div>
  )
}

// ── Tendência por disciplina ───────────────────────────────────────
interface TrendBadgeProps {
  trend: string
  score: number
  label: string
  color: string
}

export function TrendBadge({ trend, score, label, color }: TrendBadgeProps) {
  const icons = {
    up:     <TrendingUp size={13} className="text-secondary" />,
    down:   <TrendingDown size={13} className="text-destructive" />,
    stable: <Minus size={13} className="text-muted-foreground" />,
  } as Record<string, React.ReactNode>

  return (
    <div className="glass-sm rounded-xl p-3 flex items-center gap-2.5">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-base font-bold tabular-nums" style={{ color }}>
          {score}
        </p>
      </div>
      {icons[trend] ?? icons.stable}
    </div>
  )
}
