"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { CountdownCard } from "@/components/dashboard/CountdownCard"
import { DailyGoalCard } from "@/components/dashboard/DailyGoalCard"
import { WeeklyActivityChart } from "@/components/dashboard/WeeklyActivityChart"
import { NextExamCard } from "@/components/dashboard/NextExamCard"
import { RecommendationCard } from "@/components/dashboard/RecommendationCard"
import { SessionTimer } from "@/components/dashboard/SessionTimer"
import { ContingencyBanner } from "@/components/study-plan/ContingencyBanner"
import { ContingencyModal } from "@/components/study-plan/ContingencyModal"

interface CountdownData {
  days: number; hours: number; minutes: number; seconds: number; enem_date: string
}
interface DailyGoalData {
  hours_goal: number; hours_completed_today: number; progress_percent: number; is_study_day: boolean
}
interface WeeklyActivityItem {
  date: string; day_label: string; hours: number; is_today: boolean
}
interface RecommendationData {
  topic_id: string; topic_name: string; subject: string; subject_label: string
  hours_allocated: number; priority: string; type: string
}
interface NotificationItem {
  id: string; type: string | null; title: string | null; message: string | null
  is_read: boolean; created_at: string
}
interface DashboardData {
  countdown: CountdownData
  daily_goal: DailyGoalData
  weekly_activity: WeeklyActivityItem[]
  recommendation: RecommendationData | null
  recent_notifications: NotificationItem[]
  user_name: string
}
interface ContingencyStatus {
  delay_detected: boolean; severity: string; days_behind: number
  hours_behind: number; delay_percent: number; health_score: number
  weakest_subject: string | null
}

interface ActiveSession {
  sessionId: string
  startedAt: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [contingency, setContingency] = useState<ContingencyStatus | null>(null)
  const [contingencyModalOpen, setContingencyModalOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("active_study_session")
    if (stored) {
      try { setActiveSession(JSON.parse(stored)) } catch { /* ignore */ }
    }
    fetchDashboard()
    api.get("/contingency/status")
      .then(({ data }) => setContingency(data))
      .catch(() => { /* plano pode não existir ainda */ })
  }, [])

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get("/dashboard")
      setData(res)
    } catch {
      toast.error("Erro ao carregar o dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = async (topicId?: string) => {
    if (activeSession) return
    try {
      const { data: res } = await api.post("/dashboard/study-sessions/start", {
        topic_id: topicId ?? null,
        session_type: "theory",
      })
      const session: ActiveSession = { sessionId: res.session_id, startedAt: Date.now() }
      setActiveSession(session)
      localStorage.setItem("active_study_session", JSON.stringify(session))
      toast.success("Sessão de estudos iniciada!")
    } catch {
      toast.error("Erro ao iniciar sessão")
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    try {
      const { data: res } = await api.post("/dashboard/study-sessions/end", {
        session_id: activeSession.sessionId,
      })
      setActiveSession(null)
      localStorage.removeItem("active_study_session")
      toast.success(`Sessão encerrada — ${res.duration_minutes}min · +${res.xp_earned} XP`)
      fetchDashboard()
    } catch {
      toast.error("Erro ao encerrar sessão")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (!data) return null

  const firstName = data.user_name.split(" ")[0]

  async function handleContingencyConfirm() {
    await api.post("/contingency/regenerate")
    setContingency(prev => prev ? { ...prev, delay_detected: false } : prev)
    setContingencyModalOpen(false)
    toast.success("Plano de contingência ativado!")
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Banner de contingência */}
      {contingency && (
        <ContingencyBanner
          status={contingency}
          onFix={() => setContingencyModalOpen(true)}
        />
      )}

      {/* Modal de contingência */}
      {contingency && (
        <ContingencyModal
          open={contingencyModalOpen}
          status={contingency}
          onClose={() => setContingencyModalOpen(false)}
          onConfirm={handleContingencyConfirm}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Olá, <span className="text-gradient-brand">{firstName}</span> 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aqui está um resumo do seu progresso hoje.
        </p>
      </div>

      {/* Row 1: Countdown + Meta diária */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CountdownCard countdown={data.countdown} />
        <DailyGoalCard
          dailyGoal={data.daily_goal}
          onStartSession={() => handleStartSession(data.recommendation?.topic_id)}
          hasActiveSession={!!activeSession}
        />
      </div>

      {/* Row 2: Atividade semanal */}
      <WeeklyActivityChart activity={data.weekly_activity} />

      {/* Row 3: Próximo simulado + Recomendação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NextExamCard />
        <RecommendationCard
          recommendation={data.recommendation}
          onStart={() => handleStartSession(data.recommendation?.topic_id)}
        />
      </div>

      {/* Floating session timer */}
      {activeSession && (
        <SessionTimer
          startedAt={activeSession.startedAt}
          onEnd={handleEndSession}
        />
      )}
    </div>
  )
}
