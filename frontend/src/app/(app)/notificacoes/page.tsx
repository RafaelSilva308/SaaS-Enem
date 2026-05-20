"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NotificationItem } from "@/components/notifications/NotificationItem"

interface NotifData {
  id: string
  type: string | null
  title: string | null
  message: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  created_at: string
}

const PER_PAGE = 20

export default function NotificacoesPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [notifs, setNotifs] = useState<NotifData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchNotifs = useCallback(async (p: number, f: "all" | "unread", replace: boolean) => {
    setLoading(true)
    try {
      const { data } = await api.get("/notifications", {
        params: { page: p, per_page: PER_PAGE, unread_only: f === "unread" },
      })
      const items: NotifData[] = data.items ?? []
      setNotifs(prev => replace ? items : [...prev, ...items])
      setTotal(data.total ?? 0)
      setHasMore(p * PER_PAGE < (data.total ?? 0))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchNotifs(1, filter, true)
  }, [filter, fetchNotifs])

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

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchNotifs(next, filter, false)
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Notificações</h1>
            <p className="text-sm text-muted-foreground">{total} no total</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck size={14} />
            Marcar tudo como lido
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["all", "unread"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "Todas" : "Não lidas"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden divide-y divide-border/30">
        {loading && notifs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Bell size={32} className="opacity-30" />
            <p className="text-sm">
              {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          notifs.map(n => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  )
}
