"use client"

import { Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgressRing } from "@/components/study-plan/ProgressRing"

interface DailyGoalData {
  hours_goal: number
  hours_completed_today: number
  progress_percent: number
  is_study_day: boolean
}

interface Props {
  dailyGoal: DailyGoalData
  onStartSession: () => void
  hasActiveSession: boolean
}

export function DailyGoalCard({ dailyGoal, onStartSession, hasActiveSession }: Props) {
  const { hours_goal, hours_completed_today, progress_percent, is_study_day } = dailyGoal
  const done = progress_percent >= 100
  const ringColor = done ? "#10b981" : "#2563eb"

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <p className="text-sm font-medium text-muted-foreground mb-3">Meta Diária</p>

      <div className="flex items-center gap-5 flex-1">
        <ProgressRing
          percentage={progress_percent}
          size={88}
          strokeWidth={7}
          color={ringColor}
          label={`${progress_percent}%`}
          sublabel="concluído"
        />
        <div className="flex-1 min-w-0">
          <p className="text-3xl font-bold leading-none">
            {hours_completed_today.toFixed(1)}
            <span className="text-base font-normal text-muted-foreground ml-1">
              / {hours_goal}h
            </span>
          </p>
          {done && (
            <p className="text-xs font-medium text-secondary mt-1.5">✓ Meta atingida hoje!</p>
          )}
          {!is_study_day && !done && (
            <p className="text-xs text-muted-foreground mt-1.5">Hoje não é dia de estudo</p>
          )}
          {is_study_day && !done && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Faltam {(hours_goal - hours_completed_today).toFixed(1)}h para a meta
            </p>
          )}
        </div>
      </div>

      <Button
        className="w-full mt-4 gap-2"
        style={{ background: hasActiveSession ? undefined : "linear-gradient(135deg,#2563eb,#7c3aed)" }}
        variant={hasActiveSession ? "outline" : "default"}
        onClick={onStartSession}
        disabled={hasActiveSession}
      >
        {hasActiveSession ? (
          <><Pause size={15} /> Sessão em andamento</>
        ) : (
          <><Play size={15} /> Iniciar Sessão</>
        )}
      </Button>
    </div>
  )
}
