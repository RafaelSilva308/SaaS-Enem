"use client"

import { Bookmark, BookmarkCheck, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserStat {
  attempts: number
  correct: number
  wrong: number
  marked_as_doubt: boolean
}

interface Question {
  id: string
  subject: string
  subject_label: string
  topic: string | null
  difficulty: string | null
  year: number | null
  statement_preview: string
  stat: UserStat | null
}

interface Props {
  question: Question
  onStudy: (id: string) => void
  onToggleDoubt: (id: string) => void
}

const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  matematica: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  cn: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  ch: "bg-amber-500/15 text-amber-400 border-amber-500/20",
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-red-400",
}

export function QuestionListItem({ question, onStudy, onToggleDoubt }: Props) {
  const { stat } = question
  const isAnswered = (stat?.attempts ?? 0) > 0
  const isCorrect = isAnswered && stat!.correct > 0

  return (
    <div
      className="glass rounded-xl p-4 hover:border-primary/20 transition-colors cursor-pointer group"
      onClick={() => onStudy(question.id)}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {isAnswered ? (
            isCorrect ? (
              <CheckCircle size={18} className="text-secondary" />
            ) : (
              <XCircle size={18} className="text-destructive" />
            )
          ) : (
            <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                SUBJECT_COLORS[question.subject] ?? "bg-muted text-muted-foreground border-border",
              )}
            >
              {question.subject_label}
            </span>
            {question.topic && (
              <span className="text-[11px] text-muted-foreground">
                {question.topic}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2 shrink-0">
              {question.difficulty && (
                <span className={cn("text-[11px] font-medium", DIFFICULTY_COLORS[question.difficulty] ?? "text-muted-foreground")}>
                  {DIFFICULTY_LABELS[question.difficulty] ?? question.difficulty}
                </span>
              )}
              {question.year && (
                <span className="text-[11px] text-muted-foreground">{question.year}</span>
              )}
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
            {question.statement_preview}
          </p>
          {isAnswered && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {stat!.attempts} tentativa{stat!.attempts !== 1 ? "s" : ""} · {stat!.correct} acerto{stat!.correct !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Doubt toggle */}
        <button
          className={cn(
            "shrink-0 p-1 rounded-lg transition-colors hover:bg-muted/50",
            stat?.marked_as_doubt ? "text-amber-400" : "text-muted-foreground/40 group-hover:text-muted-foreground",
          )}
          onClick={(e) => { e.stopPropagation(); onToggleDoubt(question.id) }}
          title={stat?.marked_as_doubt ? "Remover dúvida" : "Marcar como dúvida"}
        >
          {stat?.marked_as_doubt ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
    </div>
  )
}
