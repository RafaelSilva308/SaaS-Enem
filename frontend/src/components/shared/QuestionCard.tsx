"use client"

import { cn } from "@/lib/utils"

interface Option { letter: string; text: string }

interface QuestionCardProps {
  index: number
  total: number
  statement: string
  imageUrl?: string | null
  options: Option[]
  selectedAnswer: string | null
  onSelect: (letter: string) => void
  showResult?: boolean
  correctAnswer?: string
  className?: string
}

const OPTION_COLORS: Record<string, string> = {
  correct: "border-secondary bg-secondary/10 text-secondary",
  wrong: "border-destructive bg-destructive/10 text-destructive",
  selected: "border-primary bg-primary/10 text-primary",
  default: "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
}

export function QuestionCard({
  index,
  total,
  statement,
  imageUrl,
  options,
  selectedAnswer,
  onSelect,
  showResult = false,
  correctAnswer,
  className,
}: QuestionCardProps) {
  function getOptionStyle(letter: string) {
    if (!showResult) {
      return selectedAnswer === letter ? OPTION_COLORS.selected : OPTION_COLORS.default
    }
    if (letter === correctAnswer) return OPTION_COLORS.correct
    if (letter === selectedAnswer && letter !== correctAnswer) return OPTION_COLORS.wrong
    return OPTION_COLORS.default
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Questão {index + 1} de {total}</span>
      </div>

      {/* Enunciado */}
      <div className="glass rounded-xl p-5">
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{statement}</p>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Imagem da questão"
            width={600}
            height={400}
            className="mt-4 rounded-lg max-w-full h-auto"
            loading="lazy"
          />
        )}
      </div>

      {/* Opções */}
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.letter}
            onClick={() => !showResult && onSelect(opt.letter)}
            disabled={showResult}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150",
              "disabled:cursor-default",
              getOptionStyle(opt.letter)
            )}
          >
            <span className="font-bold min-w-[24px] text-sm mt-0.5">{opt.letter})</span>
            <span className="text-sm leading-relaxed">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
