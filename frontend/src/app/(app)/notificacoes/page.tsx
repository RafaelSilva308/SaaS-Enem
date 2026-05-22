"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCheck, Loader2, Settings, PenTool, Trophy, Target, Sparkles, Users, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

interface NotifData {
  id: string; type: string | null; title: string | null; message: string | null
  related_entity_type: string | null; related_entity_id: string | null
  is_read: boolean; created_at: string
}

const PER_PAGE = 20

const NOTIF_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  badge_earned:        { icon: Trophy,       color: "#fbbf24" },
  level_up:            { icon: Sparkles,     color: "#a78bfa" },
  essay_analyzed:      { icon: PenTool,      color: "#a78bfa" },
  simulado_reminder:   { icon: Target,       color: "#60a5fa" },
  sprint_completed:    { icon: CheckCircle2, color: "#34d399" },
  daily_reminder:      { icon: Bell,         color: "#60a5fa" },
  plan_updated:        { icon: Sparkles,     color: "#a78bfa" },
  forum_reply:         { icon: Users,        color: "#60a5fa" },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "há poucos min"
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "ontem"
  return `${d} dias`
}

function groupByDate(notifs: NotifData[]) {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups: Record<string, NotifData[]> = {}
  notifs.forEach(n => {
    const d = new Date(n.created_at).toDateString()
    const label = d === today ? "Hoje" : d === yesterday ? "Ontem" : "Mais antigas"
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })
  return groups
}

export default function NotificacoesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [notifs, setNotifs] = useState<NotifData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchNotifs = useCallback(async (p: number, f: "all" | "unread", replace: boolean) => {
    setLoading(true)
    try {
      const { data } = await api.get("/notifications", { params: { page: p, per_page: PER_PAGE, unread_only: f === "unread" } })
      const items: NotifData[] = data.items ?? []
      setNotifs(prev => replace ? items : [...prev, ...items])
      setTotal(data.total ?? 0)
      setHasMore(p * PER_PAGE < (data.total ?? 0))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { setPage(1); fetchNotifs(1, filter, true) }, [filter, fetchNotifs])

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all")
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length
  const groups = groupByDate(notifs)

  const TABS = [
    { id: "all" as const, label: "Todas", count: total },
    { id: "unread" as const, label: "Não lidas", count: unreadCount },
  ]

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Conta → Notificações</div>
            <h1 className="page-title">Notificações</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
              Marcar todas como lidas
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push("/app/configuracoes")}>
              <Settings size={13} /> Preferências
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="row between" style={{ marginBottom: 18 }}>
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${filter === t.id ? "tab-active" : ""}`} onClick={() => setFilter(t.id)}>
                {t.label} <span className="mono" style={{ marginLeft: 4, opacity: 0.6 }}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List grouped */}
        {loading && notifs.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--muted-foreground)" }} size={24} />
          </div>
        ) : notifs.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <Bell size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </div>
          </div>
        ) : (
          <div className="col" style={{ gap: 24 }}>
            {Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                <div className="row" style={{ gap: 8, marginBottom: 10, fontSize: 11.5, color: "var(--muted-foreground)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                  <span>{label}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {items.map(n => {
                    const iconCfg = NOTIF_ICON[n.type ?? ""] ?? { icon: Bell, color: "#60a5fa" }
                    const Ico = iconCfg.icon
                    return (
                      <div key={n.id} className="row card card-hover" style={{ padding: 14, gap: 14, background: n.is_read ? "rgba(15,23,42,0.65)" : "rgba(37,99,235,0.04)", border: `1px solid ${n.is_read ? "var(--border)" : "rgba(37,99,235,0.18)"}`, cursor: "pointer", position: "relative" }} onClick={() => markRead(n.id)}>
                        {!n.is_read && <span style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", width: 4, height: 28, background: "var(--primary)", borderRadius: 999 }} />}
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${iconCfg.color}20`, color: iconCfg.color, display: "grid", placeItems: "center", flexShrink: 0, marginLeft: 8 }}>
                          <Ico size={15} />
                        </div>
                        <div className="col" style={{ flex: 1, lineHeight: 1.3 }}>
                          <div style={{ fontSize: 13.5, fontWeight: n.is_read ? 500 : 600 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{n.message}</div>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{timeAgo(n.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => { const next = page + 1; setPage(next); fetchNotifs(next, filter, false) }} disabled={loading}>
              {loading && <span className="spinner" />}
              Carregar mais
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
