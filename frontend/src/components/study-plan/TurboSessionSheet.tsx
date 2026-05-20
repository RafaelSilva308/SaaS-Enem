"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Loader2, Timer, X, XCircle, Zap } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Option { id: string; letter: string; text: string }
interface Question {
  id: string; statement: string; topic: string | null
  difficulty: string; correct_answer: string; options: Option[]
}
interface TurboSession {
  subject: string; subject_label: string; topic_suggestion: string | null
  questions: Question[]; time_limit_minutes: number
}

interface Props {
  open: boolean
  subject?: string
  onClose: () => void
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil", medium: "Médio", hard: "Difícil",
}

export function TurboSessionSheet({ open, subject, onClose }: Props) {
  const [session, setSession] = useState<TurboSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setAnswers([])
    setFinished(false)

    api.get("/contingency/turbo-session", { params: subject ? { subject } : {} })
      .then(({ data }) => {
        setSession(data)
        setTimeLeft(data.time_limit_minutes * 60)
      })
      .catch(() => onClose())
      .finally(() => setLoading(false))
  }, [open, subject, onClose])

  // Countdown timer
  useEffect(() => {
    if (!session || finished || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); setFinished(true); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [session, finished, timeLeft])

  if (!open) return null

  const q = session?.questions[current]
  const totalQ = session?.questions.length ?? 0
  const correctCount = answers.filter(Boolean).length
  const timerMin = Math.floor(timeLeft / 60)
  const timerSec = timeLeft % 60
  const timerPct = session ? (timeLeft / (session.time_limit_minutes * 60)) * 100 : 100

  function handleSelect(letter: string) {
    if (revealed) return
    setSelected(letter)
  }

  function handleConfirm() {
    if (!selected || !q) return
    const correct = selected === q.correct_answer
    setAnswers(prev => [...prev, correct])
    setRevealed(true)
  }

  function handleNext() {
    if (current + 1 >= totalQ) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 w-full sm:max-w-lg glass-strong rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              Sessão Turbo · {session?.subject_label ?? "…"}
            </p>
            {session?.topic_suggestion && (
              <p className="text-[11px] text-muted-foreground truncate">
                Foco: {session.topic_suggestion}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : finished ? (
          <FinishedView
            correct={correctCount}
            total={totalQ}
            onClose={onClose}
          />
        ) : q ? (
          <div className="p-4 space-y-4">
            {/* Progress + Timer */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Questão {current + 1} de {totalQ}</span>
                  <span className={cn(timerPct < 25 && "text-destructive font-bold")}>
                    <Timer size={10} className="inline mr-0.5" />
                    {timerMin}:{timerSec.toString().padStart(2, "0")}
                  </span>
                </div>
                <Progress value={(current / totalQ) * 100} className="h-1" />
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                q.difficulty === "hard"   ? "bg-red-500/15 text-red-400"
                : q.difficulty === "easy" ? "bg-green-500/15 text-green-400"
                :                           "bg-amber-500/15 text-amber-400",
              )}>
                {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
              </span>
            </div>

            {/* Statement */}
            <div className="text-sm leading-relaxed bg-muted/20 rounded-xl p-4 max-h-40 overflow-y-auto">
              {q.statement}
            </div>

            {/* Options */}
            <div className="space-y-2">
              {q.options.map(opt => {
                const isSelected = selected === opt.letter
                const isCorrect = opt.letter === q.correct_answer
                let cls = "border-white/10 text-foreground"
                if (revealed) {
                  if (isCorrect) cls = "border-secondary/60 bg-secondary/10 text-secondary"
                  else if (isSelected && !isCorrect) cls = "border-destructive/60 bg-destructive/10 text-destructive"
                } else if (isSelected) {
                  cls = "border-primary/60 bg-primary/10 text-primary"
                }
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.letter)}
                    disabled={revealed}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border text-sm text-left transition-all",
                      cls,
                      !revealed && "hover:border-white/20 hover:bg-white/5",
                    )}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {opt.letter}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {revealed && isCorrect && <CheckCircle size={14} className="text-secondary shrink-0 mt-0.5" />}
                    {revealed && isSelected && !isCorrect && <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />}
                  </button>
                )
              })}
            </div>

            {/* Action */}
            <div className="flex gap-2 pt-1">
              {!revealed ? (
                <Button
                  className="flex-1 gradient-blue hover:opacity-90 font-semibold"
                  onClick={handleConfirm}
                  disabled={!selected}
                >
                  Confirmar resposta
                </Button>
              ) : (
                <Button className="flex-1 gradient-brand hover:opacity-90 font-semibold" onClick={handleNext}>
                  {current + 1 >= totalQ ? "Ver resultado" : "Próxima questão →"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

function FinishedView({ correct, total, onClose }: { correct: number; total: number; onClose: () => void }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const msg = pct >= 80 ? "Excelente! Continue assim." : pct >= 60 ? "Bom trabalho! Revise os erros." : "Revise os tópicos com atenção."

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center">
        <Zap size={28} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold">{correct}/{total} corretas</p>
        <p className="text-sm text-muted-foreground mt-1">{msg}</p>
      </div>
      <div className="w-full">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Desempenho</span><span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <Button className="w-full gradient-blue hover:opacity-90 font-semibold" onClick={onClose}>
        Fechar
      </Button>
    </div>
  )
}
