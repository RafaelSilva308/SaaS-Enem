"use client"

import { cn } from "@/lib/utils"

interface Props {
  total: number
  currentIndex: number
  answered: boolean[]   // per-question
  marked: boolean[]     // per-question
  onNavigate: (index: number) => void
}

export function QuestionGrid({ total, currentIndex, answered, marked, onNavigate }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Questões
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === currentIndex
          const isAnswered = answered[i]
          const isMarked = marked[i]

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-semibold transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isMarked && isAnswered && "bg-amber-500/80 text-white",
                isMarked && !isAnswered && "bg-amber-500/30 text-amber-400 border border-amber-500/40",
                !isMarked && isAnswered && "bg-secondary/80 text-white",
                !isMarked && !isAnswered && !isCurrent && "bg-muted/50 text-muted-foreground hover:bg-muted",
                isCurrent && !isAnswered && !isMarked && "bg-primary/20 text-primary",
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-secondary/80 inline-block" />
          Respondida
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-500/80 inline-block" />
          Revisão
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-muted/50 inline-block" />
          Não respondida
        </span>
      </div>
    </div>
  )
}
