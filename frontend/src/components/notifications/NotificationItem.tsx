"use client"

import { cn } from "@/lib/utils"

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

interface Props {
  notification: NotifData
  onMarkRead?: (id: string) => void
  compact?: boolean
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  badge_earned:          { emoji: "🏅", color: "#f59e0b" },
  level_up:              { emoji: "⭐", color: "#2563eb" },
  essay_analyzed:        { emoji: "✍️", color: "#10b981" },
  exam_completed:        { emoji: "📋", color: "#10b981" },
  sprint_completed:      { emoji: "⚡", color: "#7c3aed" },
  streak_at_risk:        { emoji: "🔥", color: "#f97316" },
  streak_broken:         { emoji: "💔", color: "#ef4444" },
  daily_reminder:        { emoji: "📚", color: "#2563eb" },
  plan_updated:          { emoji: "📅", color: "#2563eb" },
  subscription_expiring: { emoji: "💳", color: "#ef4444" },
  goal_not_reached:      { emoji: "⚠️", color: "#f59e0b" },
  delay_detected:        { emoji: "⏰", color: "#f59e0b" },
}

const _rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60) return _rtf.format(-s, "second")
    const m = Math.floor(s / 60)
    if (m < 60) return _rtf.format(-m, "minute")
    const h = Math.floor(m / 60)
    if (h < 24) return _rtf.format(-h, "hour")
    const d = Math.floor(h / 24)
    if (d < 30) return _rtf.format(-d, "day")
    const mo = Math.floor(d / 30)
    if (mo < 12) return _rtf.format(-mo, "month")
    return _rtf.format(-Math.floor(mo / 12), "year")
  } catch {
    return ""
  }
}

export function NotificationItem({ notification: n, onMarkRead, compact = false }: Props) {
  const cfg = TYPE_CONFIG[n.type ?? ""] ?? { emoji: "🔔", color: "#94a3b8" }

  return (
    <div
      className={cn(
        "flex items-start gap-3 transition-colors",
        compact ? "px-4 py-3 hover:bg-muted/20" : "px-5 py-4 hover:bg-muted/10",
        !n.is_read && "bg-primary/4",
        onMarkRead && "cursor-pointer",
      )}
      onClick={() => onMarkRead && !n.is_read && onMarkRead(n.id)}
    >
      {/* Icon */}
      <div
        className={cn(
          "rounded-xl flex items-center justify-center shrink-0 text-base",
          compact ? "w-8 h-8" : "w-10 h-10",
        )}
        style={{ background: `${cfg.color}15` }}
      >
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-medium leading-tight",
            compact ? "text-xs" : "text-sm",
            !n.is_read && "text-foreground",
            n.is_read && "text-muted-foreground",
          )}>
            {n.title ?? "Notificação"}
          </p>
          {!n.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
          )}
        </div>
        {n.message && (
          <p className={cn(
            "text-muted-foreground mt-0.5 line-clamp-2",
            compact ? "text-[11px]" : "text-xs",
          )}>
            {n.message}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          {timeAgo(n.created_at)}
        </p>
      </div>
    </div>
  )
}
