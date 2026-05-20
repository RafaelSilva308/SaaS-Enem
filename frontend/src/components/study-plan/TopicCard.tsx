"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Brain, Clock, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  name: string
  subject: string
  subject_label: string
  hours_allocated: number
  type: "theory" | "practice" | "review"
  priority: string
  scheduled_days: string[]
  is_completed: boolean
}

interface Props {
  topic: Topic
  onToggle?: (topicId: string, completed: boolean, xp: number) => void
}

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "bg-primary/15 text-primary border-primary/20",
  matematica: "bg-secondary/15 text-secondary border-secondary/20",
  cn:         "bg-accent/15 text-accent border-accent/20",
  ch:         "bg-yellow-400/15 text-yellow-400 border-yellow-400/20",
}

const TYPE_ICONS = {
  theory:   BookOpen,
  practice: Brain,
  review:   RefreshCw,
}

const TYPE_LABELS = { theory: "Teoria", practice: "Prática", review: "Revisão" }

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high:     "bg-orange-400/15 text-orange-400",
  medium:   "bg-yellow-400/15 text-yellow-400",
  low:      "bg-muted/50 text-muted-foreground",
}

export function TopicCard({ topic, onToggle }: Props) {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(topic.is_completed)
  const TypeIcon = TYPE_ICONS[topic.type] ?? BookOpen

  async function handleToggle() {
    setLoading(true)
    try {
      const { data } = await api.post(`/study-plans/topics/${topic.id}/complete`)
      setCompleted(data.is_completed)
      if (data.is_completed) toast.success(`+${data.xp_earned} XP — ${topic.name}`)
      onToggle?.(topic.id, data.is_completed, data.xp_earned)
    } catch {
      toast.error("Erro ao atualizar tópico")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      layout
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border transition-all",
        completed
          ? "border-white/5 bg-white/2 opacity-60"
          : "glass hover:border-white/20"
      )}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={completed}
          disabled={loading}
          onCheckedChange={handleToggle}
          className="border-white/20 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className={cn("text-sm font-medium leading-snug", completed && "line-through text-muted-foreground")}>
          {topic.name}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Área */}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border font-medium",
            SUBJECT_COLORS[topic.subject] ?? "bg-muted/50 text-muted-foreground border-white/10")}>
            {topic.subject_label}
          </span>

          {/* Tipo */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TypeIcon size={10} />{TYPE_LABELS[topic.type]}
          </span>

          {/* Horas */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />{topic.hours_allocated}h
          </span>

          {/* Prioridade */}
          {topic.priority === "critical" && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", PRIORITY_BADGE.critical)}>
              Prioritário
            </span>
          )}
        </div>

        {/* Dias agendados */}
        {topic.scheduled_days.length > 0 && (
          <div className="flex gap-1">
            {topic.scheduled_days.map(d => (
              <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground uppercase font-mono">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
