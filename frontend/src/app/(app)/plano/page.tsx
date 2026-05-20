"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle, BookOpen, Calendar, CheckCircle, ChevronDown,
  ChevronRight, Loader2, RefreshCw, Settings2, SlidersHorizontal,
  Sparkles, Zap,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { ContingencyModal } from "@/components/study-plan/ContingencyModal"
import { TurboSessionSheet } from "@/components/study-plan/TurboSessionSheet"
import { TopicCard } from "@/components/study-plan/TopicCard"
import { ProgressRing } from "@/components/study-plan/ProgressRing"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────
interface Topic {
  id: string; name: string; subject: string; subject_label: string
  hours_allocated: number; type: string; priority: string
  scheduled_days: string[]; is_completed: boolean
}
interface Sprint {
  id: string; week_number: number; start_date: string; end_date: string
  theme: string | null; total_hours_allocated: number; hours_completed: number
  status: string; progress_percentage: number; topics: Topic[]
}
interface SubjectProgress {
  subject: string; label: string; color: string
  topics_completed: number; topics_total: number
  hours_completed: number; hours_total: number; percentage: number
}
interface StudyPlan {
  plan_id: string; status: string; daily_hours_goal: number
  weeks_remaining: number; total_weeks: number; enem_date: string
  overall_progress: number; current_sprint: Sprint | null
  next_sprint: Sprint | null; subjects_progress: SubjectProgress[]
  all_sprints: Sprint[]
}

const VIEW_TABS = [
  { id: "sprint", label: "Sprint atual", icon: BookOpen },
  { id: "timeline", label: "Calendário", icon: Calendar },
  { id: "areas",   label: "Por área",    icon: RefreshCw },
]

const DAY_LABELS: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui",
  sex: "Sex", sab: "Sáb", dom: "Dom",
}
const ALL_DAYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

// ── Sprint View ────────────────────────────────────────────────────
function SprintView({ plan, onUpdate }: { plan: StudyPlan; onUpdate: () => void }) {
  const sprint = plan.current_sprint
  if (!sprint) {
    return (
      <div className="text-center py-12 space-y-3">
        <CheckCircle size={40} className="text-secondary mx-auto" />
        <p className="font-semibold">Todos os sprints concluídos!</p>
        <p className="text-muted-foreground text-sm">Você está pronto para o ENEM.</p>
      </div>
    )
  }

  const startFmt = new Date(sprint.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  const endFmt   = new Date(sprint.end_date   + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

  // Agrupar tópicos por dia
  const topicsByDay: Record<string, Topic[]> = {}
  ALL_DAYS.forEach(d => { topicsByDay[d] = sprint.topics.filter(t => t.scheduled_days.includes(d)) })

  return (
    <div className="space-y-5">
      {/* Header do sprint */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <ProgressRing
          percentage={sprint.progress_percentage}
          size={80}
          color="#2563eb"
          label={`${sprint.progress_percentage}%`}
          sublabel="feito"
        />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Semana {sprint.week_number}</p>
          <p className="font-bold leading-snug">{sprint.theme ?? "Revisão geral"}</p>
          <p className="text-xs text-muted-foreground mt-1">{startFmt} – {endFmt}</p>
          <Progress value={sprint.progress_percentage} className="h-1.5 mt-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {sprint.hours_completed.toFixed(1)}h / {sprint.total_hours_allocated.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Tópicos agrupados por dia */}
      <div className="space-y-4">
        {ALL_DAYS.map(day => {
          const topics = topicsByDay[day]
          if (!topics.length) return null
          return (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {DAY_LABELS[day]}
              </p>
              <div className="space-y-2">
                {topics.map(t => (
                  <TopicCard key={t.id} topic={t as any} onToggle={onUpdate} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Próximo sprint */}
      {plan.next_sprint && (
        <div className="glass rounded-xl p-4 border border-white/5">
          <p className="text-xs text-muted-foreground mb-1">Próxima semana</p>
          <p className="text-sm font-medium">{plan.next_sprint.theme ?? "Revisão geral"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.next_sprint.total_hours_allocated.toFixed(1)}h · {plan.next_sprint.topics.length} tópicos
          </p>
        </div>
      )}
    </div>
  )
}

// ── Timeline View ──────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb", matematica: "#10b981", cn: "#7c3aed", ch: "#f59e0b",
}

function TimelineView({ plan }: { plan: StudyPlan }) {
  const today = new Date().toISOString().split("T")[0]

  return (
    <ScrollArea className="h-[520px] pr-2">
      <div className="space-y-2">
        {plan.all_sprints.map(sprint => {
          const isCurrent = sprint.start_date <= today && today <= sprint.end_date
          const isPast = sprint.end_date < today

          // Cor dominante do sprint
          const subjectHours: Record<string, number> = {}
          sprint.topics.forEach(t => {
            subjectHours[t.subject] = (subjectHours[t.subject] ?? 0) + t.hours_allocated
          })
          const dominant = Object.entries(subjectHours).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "linguagens"

          return (
            <motion.div
              key={sprint.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                isCurrent ? "border-primary/40 bg-primary/5 glow-blue" :
                isPast    ? "border-white/5 opacity-60" :
                            "border-white/8 glass-sm"
              )}
            >
              {/* Barra de cor da disciplina dominante */}
              <div className="w-1 h-10 rounded-full shrink-0"
                style={{ backgroundColor: SUBJECT_COLORS[dominant] }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium truncate">{sprint.theme ?? "Revisão geral"}</p>
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                      ATUAL
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Sem. {sprint.week_number} ·{" "}
                  {new Date(sprint.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  {" "}–{" "}
                  {new Date(sprint.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-bold">{sprint.progress_percentage}%</p>
                <p className="text-[10px] text-muted-foreground">{sprint.total_hours_allocated.toFixed(0)}h</p>
              </div>

              <div className="w-14">
                <Progress value={sprint.progress_percentage} className="h-1" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ── Areas View ─────────────────────────────────────────────────────
function AreasView({ plan }: { plan: StudyPlan }) {
  // Agrupar todos os tópicos por disciplina
  const bySubject: Record<string, Topic[]> = { linguagens: [], matematica: [], cn: [], ch: [] }
  plan.all_sprints.forEach(s => s.topics.forEach(t => {
    if (t.subject in bySubject) bySubject[t.subject].push(t)
  }))

  return (
    <Accordion multiple className="space-y-2">
      {plan.subjects_progress.map(sp => (
        <AccordionItem key={sp.subject} value={sp.subject}
          className="glass rounded-xl border-white/10 px-0 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3 w-full">
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: sp.color }} />
              <span className="font-medium text-sm">{sp.label}</span>
              <div className="flex-1 mx-3">
                <Progress value={sp.percentage} className="h-1.5"
                  style={{ "--progress-fill": sp.color } as React.CSSProperties} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {sp.topics_completed}/{sp.topics_total}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 pt-1">
              {(bySubject[sp.subject] ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum tópico encontrado.</p>
              ) : (
                (bySubject[sp.subject] ?? []).map(t => (
                  <div key={t.id} className={cn(
                    "flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0",
                    t.is_completed && "opacity-50"
                  )}>
                    {t.is_completed
                      ? <CheckCircle size={12} className="text-secondary shrink-0" />
                      : <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" />
                    }
                    <span className={cn("flex-1", t.is_completed && "line-through")}>{t.name}</span>
                    <span className="text-muted-foreground">{t.hours_allocated}h</span>
                  </div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

// ── Adjust Panel ───────────────────────────────────────────────────
function AdjustPanel({ plan, onAdjusted }: { plan: StudyPlan; onAdjusted: () => void }) {
  const [hours, setHours] = useState(plan.daily_hours_goal)
  const [days, setDays] = useState<string[]>(["seg", "ter", "qua", "qui", "sex"])
  const [loading, setLoading] = useState(false)

  const toggleDay = (d: string) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  async function handleSave() {
    if (days.length === 0) return toast.error("Selecione pelo menos 1 dia disponível")
    setLoading(true)
    try {
      await api.put(`/study-plans/${plan.plan_id}/adjust`, {
        daily_hours_goal: hours,
        available_days: days,
      })
      toast.success("Plano ajustado com sucesso!")
      onAdjusted()
    } catch {
      toast.error("Erro ao ajustar plano")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-3">
        <p className="text-sm font-medium">
          Horas de estudo por dia: <span className="text-primary font-bold">{hours}h</span>
        </p>
        <Slider
          min={0.5} max={8} step={0.5} value={[hours]}
          onValueChange={(v) => setHours(Array.isArray(v) ? (v as number[])[0] : (v as number))}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5h</span><span>8h</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Dias disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map(d => (
            <button key={d} onClick={() => toggleDay(d)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                days.includes(d)
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-white/10 text-muted-foreground hover:border-white/20"
              )}>
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-3 space-y-1">
        <p className="text-xs font-medium">Estimativa com essas configurações:</p>
        <p className="text-xs text-muted-foreground">
          {hours * days.length * 4}h/mês ·{" "}
          {Math.round(hours * days.length * plan.weeks_remaining)}h até o ENEM
        </p>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full gradient-blue hover:opacity-90 font-semibold">
        {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : <Settings2 size={14} className="mr-2" />}
        {loading ? "Recalculando…" : "Salvar e recalcular plano"}
      </Button>
    </div>
  )
}

interface ContingencyStatus {
  delay_detected: boolean; severity: string; days_behind: number
  hours_behind: number; delay_percent: number; health_score: number
  weakest_subject: string | null
}

const HEALTH_CONFIG = (score: number) => {
  if (score >= 80) return { label: "No prazo", color: "#10b981", dot: "bg-emerald-500" }
  if (score >= 50) return { label: "Leve atraso", color: "#f59e0b", dot: "bg-amber-500" }
  return { label: "Atraso crítico", color: "#ef4444", dot: "bg-red-500" }
}

// ── Main Page ──────────────────────────────────────────────────────
export default function PlanoPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeView, setActiveView] = useState("sprint")
  const [contingency, setContingency] = useState<ContingencyStatus | null>(null)
  const [contingencyModalOpen, setContingencyModalOpen] = useState(false)
  const [turboOpen, setTurboOpen] = useState(false)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get("/study-plans/me")
      setPlan(data)
    } catch (err: any) {
      if (err.response?.status === 404) setPlan(null)
      else toast.error("Erro ao carregar plano")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
    api.get("/contingency/status")
      .then(({ data }) => setContingency(data))
      .catch(() => { /* plano pode não existir ainda */ })
  }, [fetchPlan])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { data } = await api.post("/study-plans/generate", { force_regenerate: !!plan })
      setPlan(data)
      toast.success("Plano de estudos gerado!")
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao gerar plano")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand">
          <Sparkles size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Crie seu plano de estudos</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Baseado no seu diagnóstico, vamos criar um plano personalizado com tópicos distribuídos
            semana a semana até o ENEM.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}
          className="gradient-brand hover:opacity-90 font-semibold px-8">
          {generating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles size={16} className="mr-2" />}
          {generating ? "Gerando plano…" : "Gerar meu plano"}
        </Button>
      </div>
    )
  }

  const enem = new Date(plan.enem_date + "T00:00:00")
  const daysLeft = Math.ceil((enem.getTime() - Date.now()) / 86400000)
  const health = contingency ? HEALTH_CONFIG(contingency.health_score) : null

  async function handleContingencyConfirm() {
    await api.post("/contingency/regenerate")
    setContingencyModalOpen(false)
    setContingency(prev => prev ? { ...prev, delay_detected: false, severity: "ok", health_score: 80 } : prev)
    fetchPlan()
    toast.success("Plano de contingência ativado!")
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Modais */}
      {contingency && (
        <ContingencyModal
          open={contingencyModalOpen}
          status={contingency}
          onClose={() => setContingencyModalOpen(false)}
          onConfirm={handleContingencyConfirm}
        />
      )}
      <TurboSessionSheet
        open={turboOpen}
        subject={contingency?.weakest_subject ?? undefined}
        onClose={() => setTurboOpen(false)}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plano de Estudos</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-muted-foreground text-sm">
              {daysLeft} dias para o ENEM · {plan.weeks_remaining} semanas restantes
            </p>
            {health && (
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={cn("w-2 h-2 rounded-full shrink-0", health.dot)} />
                <span style={{ color: health.color }}>{health.label}</span>
                {contingency?.delay_detected && (
                  <span className="text-muted-foreground">({contingency.days_behind}d atrás)</span>
                )}
              </div>
            )}
          </div>
        </div>
        <Sheet>
          <SheetTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-white/10 bg-transparent hover:bg-white/5 transition-colors">
            <SlidersHorizontal size={14} /> Ajustar
          </SheetTrigger>
          <SheetContent side="right" className="glass-strong border-white/10 w-80">
            <SheetHeader>
              <SheetTitle>Ajustar plano</SheetTitle>
            </SheetHeader>
            <AdjustPanel plan={plan} onAdjusted={fetchPlan} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Ações de contingência */}
      {contingency?.delay_detected && (
        <div className="flex gap-2">
          <button
            onClick={() => setContingencyModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 transition-colors"
          >
            <AlertCircle size={13} />
            Corrigir plano ({contingency.days_behind}d atrás)
          </button>
          <button
            onClick={() => setTurboOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
          >
            <Zap size={13} />
            Turbo 15min
          </button>
        </div>
      )}
      {!contingency?.delay_detected && (
        <button
          onClick={() => setTurboOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
        >
          <Zap size={13} />
          Sessão turbo (15min)
        </button>
      )}

      {/* Progresso geral */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-5">
          <ProgressRing
            percentage={plan.overall_progress}
            size={72}
            color="#10b981"
            label={`${plan.overall_progress}%`}
            sublabel="geral"
          />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">Progresso total</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {plan.subjects_progress.map(sp => (
                <div key={sp.subject} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sp.color }} />
                  <span className="text-xs text-muted-foreground truncate">{sp.label}</span>
                  <span className="text-xs font-medium ml-auto">{sp.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de visualização */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        {VIEW_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveView(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              activeView === id ? "gradient-blue text-white" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeView} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeView === "sprint"    && <SprintView   plan={plan} onUpdate={fetchPlan} />}
          {activeView === "timeline"  && <TimelineView plan={plan} />}
          {activeView === "areas"     && <AreasView    plan={plan} />}
        </motion.div>
      </AnimatePresence>

      {/* Regenerar plano */}
      <button onClick={handleGenerate} disabled={generating}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 py-2">
        <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
        {generating ? "Recalculando…" : "Regenerar plano do zero"}
      </button>
    </div>
  )
}
