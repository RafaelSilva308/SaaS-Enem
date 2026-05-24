"use client"

import { useEffect, useState } from "react"
import {
  Shield, Crown, RefreshCw, FileText, Plus, Users, Activity,
  DollarSign, PenTool, Target, Search, Filter, MoreHorizontal,
  ChevronLeft, ChevronRight, Loader2,
} from "lucide-react"
import { api } from "@/lib/api"

interface DailyItem { date: string; sessions: number; active_users: number }
interface TriBucket { label: string; count: number }
interface SubPlanBucket { plan_type: string; count: number }
interface Metrics {
  total_users: number; new_users_30d: number; dau: number; mau: number
  active_subscriptions: number; mrr_brl: number; essays_analyzed_30d: number
  exams_completed_30d: number; churn_rate_pct: number
  sub_distribution: SubPlanBucket[]; tri_histogram: TriBucket[]
  daily_activity: DailyItem[]
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free", premium_1m: "Pro Mensal", premium_3m: "Pro Trimestral",
  premium_6m: "Pro Semestral", premium_trial: "Trial",
}
const PLAN_TAGS: Record<string, string> = {
  free: "default", premium_1m: "primary", premium_3m: "primary",
  premium_6m: "premium", premium_trial: "amber",
}

// Inline SVG sparkline
function Sparkline({ data, width = 120, height = 28, color = "#60a5fa" }: {
  data: number[]; width?: number; height?: number; color?: string
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2])
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
  const fill = `${line} L ${width} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={line} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Inline stacked area chart
function StackedAreaChart() {
  const months = ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"]
  const free = [4800, 5800, 6900, 7800, 8200, 8420]
  const premium = [600, 850, 1140, 1620, 2080, 2422]
  const W = 560, H = 200, P = 28
  const max = Math.max(...free.map((f, i) => f + premium[i])) * 1.05
  const innerW = W - P * 2, innerH = H - P * 2
  const step = innerW / (months.length - 1)
  const ptsFree = free.map((v, i) => [P + i * step, P + innerH - (v / max) * innerH])
  const ptsTotal = free.map((v, i) => [P + i * step, P + innerH - ((v + premium[i]) / max) * innerH])
  const pathOf = (pts: number[][]) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
  const fillFree = `${pathOf(ptsFree)} L ${P + innerW} ${P + innerH} L ${P} ${P + innerH} Z`
  const fillStack = `${pathOf(ptsTotal)} ${[...ptsFree].reverse().map(p => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="free-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="prem-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
        <line key={i} x1={P} x2={P + innerW} y1={P + r * innerH} y2={P + r * innerH}
          stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
      ))}
      <path d={fillStack} fill="url(#prem-grad)" />
      <path d={fillFree} fill="url(#free-grad)" />
      <path d={pathOf(ptsTotal)} stroke="#a78bfa" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={pathOf(ptsFree)} stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" />
      {ptsTotal.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#a78bfa" stroke="#020617" strokeWidth="2" />
      ))}
      {months.map((m, i) => (
        <text key={i} x={P + i * step} y={H - 8} fill="rgba(148,163,184,0.7)"
          fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{m}</text>
      ))}
    </svg>
  )
}

async function downloadCsv(type: "subscriptions" | "essays") {
  const { data } = await api.get(`/admin/analytics/${type}`, { responseType: "blob" })
  const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }))
  const a = document.createElement("a")
  a.href = url; a.download = `${type}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

const LOGS = [
  { t: "12:42:18", who: "ana.b@email.com", action: "completou Simulado #09", tag: "success" },
  { t: "12:42:02", who: "pedro.h@email.com", action: "ativou trial Pro Anual", tag: "primary" },
  { t: "12:41:47", who: "system", action: "correção IA finalizada (red. #18421)", tag: "premium" },
  { t: "12:41:33", who: "julia.c@email.com", action: "entrou (novo dispositivo)", tag: "default" },
  { t: "12:41:08", who: "system", action: "renovação automática · R$ 358,80", tag: "success" },
  { t: "12:40:51", who: "tiago.a@email.com", action: "reportou erro questão Q.187", tag: "amber" },
]

const RECENT_USERS = [
  { name: "Ana Beatriz Silva", email: "ana.beatriz@email.com", plan: "Pro Anual", planTag: "premium", status: "Ativo", statusTag: "success", last: "há 2 min" },
  { name: "Pedro Henrique Lima", email: "pedro.h@email.com", plan: "Pro Mensal", planTag: "primary", status: "Ativo", statusTag: "success", last: "há 8 min" },
  { name: "Júlia Cardoso", email: "julia.c@email.com", plan: "Free", planTag: "default", status: "Trial", statusTag: "amber", last: "há 14 min" },
  { name: "Mateus Oliveira", email: "mateus.o@email.com", plan: "Pro Anual", planTag: "premium", status: "Ativo", statusTag: "success", last: "há 32 min" },
  { name: "Larissa Mendes", email: "larissa@email.com", plan: "Free", planTag: "default", status: "Inativo", statusTag: "default", last: "há 3 dias" },
  { name: "Tiago Alves", email: "tiago.alves@email.com", plan: "Pro Mensal", planTag: "primary", status: "Ativo", statusTag: "success", last: "há 1 h" },
]

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get("/admin/metrics")
      setMetrics(data)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const handleRefresh = () => { setRefreshing(true); load() }

  if (loading) {
    return (
      <div className="page-scroll">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 className="animate-spin" style={{ color: "var(--muted-foreground)" }} size={28} />
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="page-scroll">
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Erro ao carregar métricas administrativas.
        </div>
      </div>
    )
  }

  const kpis = [
    {
      icon: Users, label: "Usuários total", color: "#60a5fa",
      value: metrics.total_users.toLocaleString("pt-BR"),
      trend: metrics.new_users_30d > 0 ? +(((metrics.new_users_30d / metrics.total_users) * 100).toFixed(1)) : 0,
      spark: [8200, 8500, 8700, 9000, 9400, 9800, 10200, metrics.total_users],
    },
    {
      icon: Activity, label: "Ativos hoje", color: "#34d399",
      value: metrics.dau.toLocaleString("pt-BR"),
      trend: 8.2,
      spark: [180, 200, 220, 210, 245, 250, 240, metrics.dau],
    },
    {
      icon: Crown, label: "Assinaturas ativas", color: "#a78bfa",
      value: metrics.active_subscriptions.toLocaleString("pt-BR"),
      trend: 22.8,
      spark: [60, 80, 100, 120, 140, 160, 170, metrics.active_subscriptions],
    },
    {
      icon: DollarSign, label: "MRR", color: "#34d399",
      value: `R$ ${(metrics.mrr_brl / 1000).toFixed(0)}k`,
      trend: 18.4,
      spark: [70000, 72000, 75000, 79000, 83000, 86000, 89000, metrics.mrr_brl],
    },
    {
      icon: PenTool, label: "Redações (30d)", color: "#fbbf24",
      value: metrics.essays_analyzed_30d.toLocaleString("pt-BR"),
      trend: -14,
      spark: [40, 38, 35, 32, 30, 28, 25, metrics.essays_analyzed_30d],
    },
    {
      icon: Target, label: "Churn (30d)", color: "#60a5fa",
      value: `${metrics.churn_rate_pct.toFixed(1)}%`,
      trend: -1.2,
      spark: [6.8, 7.0, 7.2, 7.5, 7.8, 8.0, 8.2, metrics.churn_rate_pct],
    },
  ]

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">

        {/* Admin banner */}
        <div className="card" style={{ padding: 12, marginBottom: 20, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.15)", display: "grid", placeItems: "center", color: "#fcd34d", flexShrink: 0 }}>
              <Shield size={14} />
            </div>
            <div className="col" style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Modo administrador</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>Você está acessando dados sensíveis da plataforma — registrado em auditoria.</div>
            </div>
            <span className="badge badge-amber" style={{ marginLeft: "auto", flexShrink: 0 }}>
              <Crown size={11} /> Admin · Master
            </span>
          </div>
        </div>

        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Admin → Dashboard</div>
            <h1 className="page-title">Painel Administrativo</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Atualizar
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv("subscriptions")}>
              <FileText size={14} /> Exportar CSV
            </button>
            <button className="btn btn-primary btn-sm">
              <Plus size={14} /> Nova questão
            </button>
          </div>
        </div>

        {/* KPI grid — 6 cols */}
        <div className="grid-6" style={{ marginBottom: 20 }}>
          {kpis.map((k, i) => {
            const Ico = k.icon
            const isUp = k.trend >= 0
            const trendColor = k.label === "Churn (30d)" ? (isUp ? "#f87171" : "#34d399") : (isUp ? "#34d399" : "#f87171")
            return (
              <div key={i} className="card" style={{ padding: "16px 18px" }}>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${k.color}18`, display: "grid", placeItems: "center", color: k.color }}>
                    <Ico size={13} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>
                    {isUp ? "+" : ""}{k.trend}%
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 2 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>{k.label}</div>
                <Sparkline data={k.spark} color={k.color} width={120} height={28} />
              </div>
            )
          })}
        </div>

        {/* Growth chart + real-time logs */}
        <div className="grid-15" style={{ marginBottom: 20 }}>
          {/* Stacked area chart */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Crescimento de usuários</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Free vs Premium · últimos 6 meses</div>
              </div>
              <div className="row" style={{ gap: 14, fontSize: 11.5 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "#60a5fa", display: "block" }} />
                  Free
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "#a78bfa", display: "block" }} />
                  Premium
                </div>
              </div>
            </div>
            <StackedAreaChart />
          </div>

          {/* Real-time logs */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Logs em tempo real</h3>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#34d399", boxShadow: "0 0 8px #34d399", display: "block" }} />
            </div>
            <div className="col" style={{ gap: 0, fontSize: 12.5 }}>
              {LOGS.map((l, i) => (
                <div key={i} className="row" style={{ gap: 10, padding: "9px 0", borderBottom: i < LOGS.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-foreground)", width: 60, flexShrink: 0 }}>{l.t}</span>
                  <span className={`badge badge-${l.tag}`} style={{ height: 18, fontSize: 10, flexShrink: 0, width: 18, display: "grid", placeItems: "center" }}>●</span>
                  <div className="col" style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.who}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>{l.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row between" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Usuários recentes</h3>
            <div className="row" style={{ gap: 8 }}>
              <div className="input-icon-wrap" style={{ width: 220 }}>
                <Search size={14} />
                <input className="input" placeholder="Buscar..." style={{ height: 34, fontSize: 12.5 }} />
              </div>
              <button className="btn btn-icon"><Filter size={14} /></button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted-foreground)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(15,23,42,0.4)" }}>
                <th style={{ padding: "12px 24px", fontWeight: 500 }}>Usuário</th>
                <th style={{ padding: "12px 8px", fontWeight: 500 }}>Email</th>
                <th style={{ padding: "12px 8px", fontWeight: 500, width: 120 }}>Plano</th>
                <th style={{ padding: "12px 8px", fontWeight: 500, width: 100 }}>Status</th>
                <th style={{ padding: "12px 8px", fontWeight: 500, width: 140 }}>Último acesso</th>
                <th style={{ padding: "12px 8px", fontWeight: 500, width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {RECENT_USERS.map((u, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 24px" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {u.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 8px", color: "var(--muted-foreground)" }} className="mono">{u.email}</td>
                  <td style={{ padding: "14px 8px" }}>
                    <span className={`badge badge-${u.planTag}`}>{u.plan}</span>
                  </td>
                  <td style={{ padding: "14px 8px" }}>
                    <span className={`badge badge-${u.statusTag}`}>{u.status}</span>
                  </td>
                  <td style={{ padding: "14px 8px", color: "var(--muted-foreground)", fontSize: 12 }}>{u.last}</td>
                  <td style={{ padding: "14px 8px", textAlign: "right" }}>
                    <button className="btn btn-icon" style={{ height: 28, width: 28 }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row between" style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted-foreground)" }}>
            <span>Mostrando 1–6 de {metrics.total_users.toLocaleString("pt-BR")} usuários</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-icon" style={{ height: 28, width: 28 }} disabled>
                <ChevronLeft size={13} />
              </button>
              <button className="btn btn-icon" style={{ height: 28, width: 28 }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
