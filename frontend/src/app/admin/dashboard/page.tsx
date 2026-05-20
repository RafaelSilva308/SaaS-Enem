"use client"

import { useEffect, useState } from "react"
import {
  BookOpen, Download, Loader2, TrendingUp, Users, Zap,
} from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

const PIE_COLORS = ["#2563eb", "#10b981", "#7c3aed", "#f59e0b", "#ef4444"]

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito", premium_1m: "1 mês", premium_3m: "3 meses",
  premium_6m: "6 meses", premium_trial: "Trial",
}

function KpiCard({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string; sub?: string; icon: React.ComponentType<any>; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
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

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/admin/metrics")
      .then(({ data }) => setMetrics(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!metrics) return <p className="text-muted-foreground">Erro ao carregar métricas.</p>

  const kpis = [
    { label: "Total de usuários", value: metrics.total_users.toLocaleString("pt-BR"), sub: `+${metrics.new_users_30d} nos últimos 30 dias`, icon: Users, color: "#2563eb" },
    { label: "DAU / MAU", value: `${metrics.dau} / ${metrics.mau}`, sub: "Usuários ativos hoje / mês", icon: Zap, color: "#10b981" },
    { label: "MRR", value: `R$ ${metrics.mrr_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: `${metrics.active_subscriptions} assinaturas ativas`, icon: TrendingUp, color: "#7c3aed" },
    { label: "Churn (30d)", value: `${metrics.churn_rate_pct.toFixed(1)}%`, sub: "Cancelamentos no período", icon: Users, color: "#f59e0b" },
    { label: "Redações corrigidas", value: metrics.essays_analyzed_30d.toString(), sub: "Últimos 30 dias", icon: BookOpen, color: "#10b981" },
    { label: "Simulados realizados", value: metrics.exams_completed_30d.toString(), sub: "Últimos 30 dias", icon: BookOpen, color: "#2563eb" },
  ]

  // Format dates for chart x-axis
  const dailyData = metrics.daily_activity.map(d => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }))

  const pieData = metrics.sub_distribution.map(d => ({
    name: PLAN_LABELS[d.plan_type] ?? d.plan_type,
    value: d.count,
  }))

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv("subscriptions")} className="gap-2 text-xs">
            <Download size={12} /> Assinaturas CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv("essays")} className="gap-2 text-xs">
            <Download size={12} /> Redações CSV
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Daily active users — line chart */}
        <div className="xl:col-span-2 glass rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Usuários ativos diários (30 dias)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#f1f5f9", fontSize: 11 }}
                itemStyle={{ color: "#2563eb", fontSize: 11 }}
              />
              <Line type="monotone" dataKey="active_users" stroke="#2563eb"
                strokeWidth={2} dot={false} name="Usuários" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription distribution — pie chart */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Distribuição de planos</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              Sem dados
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    itemStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TRI histogram */}
      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold mb-4">Distribuição de scores TRI</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={metrics.tri_histogram} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              itemStyle={{ color: "#10b981", fontSize: 11 }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Usuários" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
