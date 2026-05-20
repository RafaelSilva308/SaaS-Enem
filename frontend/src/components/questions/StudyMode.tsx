"use client"

import { useEffect, useState, useCallback } from "react"
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, Trophy } from "lucide-react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import { Button } from "@/components/ui/button"
import { QuestionCard } from "@/components/shared/QuestionCard"
import { api } from "@/lib/api"

interface QuestionDetail {
  id: string
  subject: string
  subject_label: string
  topic: string | null
  difficulty: string | null
  year: number | null
  statement: string
  image_url: string | null
  time_estimate_seconds: number
  options: { letter: string; text: string }[]
}

interface AnswerResult {
  is_correct: boolean
  correct_answer: string
  explanation: string | null
  xp_earned: number
}

interface Props {
  questionIds: string[]
  onClose: () => void
}

export function StudyMode({ questionIds, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [question, setQuestion] = useState<QuestionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, xp: 0 })

  const loadQuestion = useCallback(async (id: string) => {
    setLoading(true)
    setSelected(null)
    setResult(null)
    try {
      const { data } = await api.get(`/questions/${id}`)
      setQuestion(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (questionIds[index]) {
      loadQuestion(questionIds[index])
    }
  }, [index, questionIds, loadQuestion])

  const handleSelect = async (letter: string) => {
    if (result || submitting) return
    setSelected(letter)
    setSubmitting(true)
    try {
      const { data } = await api.post("/questions/answer", {
        question_id: questionIds[index],
        answer: letter,
      })
      setResult(data)
      setSessionStats((prev) => ({
        correct: prev.correct + (data.is_correct ? 1 : 0),
        wrong: prev.wrong + (data.is_correct ? 0 : 1),
        xp: prev.xp + data.xp_earned,
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (index < questionIds.length - 1) {
      setIndex((i) => i + 1)
    } else {
      setFinished(true)
    }
  }

  const progress = ((index + (result ? 1 : 0)) / questionIds.length) * 100

  if (finished) {
    const total = sessionStats.correct + sessionStats.wrong
    const pct = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 text-center max-w-lg mx-auto"
      >
        <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Sessão concluída!</h2>
        <p className="text-muted-foreground mb-6">Você respondeu {total} questão{total !== 1 ? "s" : ""}</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-sm rounded-xl p-4">
            <p className="text-2xl font-bold text-secondary">{sessionStats.correct}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Corretas</p>
          </div>
          <div className="glass-sm rounded-xl p-4">
            <p className="text-2xl font-bold text-destructive">{sessionStats.wrong}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Erradas</p>
          </div>
          <div className="glass-sm rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acertos</p>
          </div>
        </div>

        {sessionStats.xp > 0 && (
          <p className="text-sm text-secondary mb-6">+{sessionStats.xp} XP ganhos nesta sessão</p>
        )}

        <Button className="w-full gradient-brand text-white" onClick={onClose}>
          Voltar para o banco de questões
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft size={16} />
          Sair
        </Button>
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-brand"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {index + 1} / {questionIds.length}
        </span>
      </div>

      {/* Question area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-24"
          >
            <Loader2 className="animate-spin text-primary" size={28} />
          </motion.div>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            drag={result ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (!result) return
              if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 400) {
                handleNext()
              }
            }}
            className="space-y-4 touch-pan-y"
          >
            {/* Question meta */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{question.subject_label}</span>
              {question.topic && <><span>·</span><span>{question.topic}</span></>}
              {question.year && <><span>·</span><span>{question.year}</span></>}
            </div>

            <QuestionCard
              index={index}
              total={questionIds.length}
              statement={question.statement}
              imageUrl={question.image_url}
              options={question.options}
              selectedAnswer={selected}
              onSelect={handleSelect}
              showResult={!!result}
              correctAnswer={result?.correct_answer}
            />

            {/* Loading overlay while submitting */}
            {submitting && !result && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            )}

            {/* Result feedback */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border ${
                    result.is_correct
                      ? "bg-secondary/10 border-secondary/20"
                      : "bg-destructive/10 border-destructive/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.is_correct ? (
                      <CheckCircle size={18} className="text-secondary" />
                    ) : (
                      <XCircle size={18} className="text-destructive" />
                    )}
                    <span className={`font-semibold text-sm ${result.is_correct ? "text-secondary" : "text-destructive"}`}>
                      {result.is_correct ? "Correto! +5 XP" : `Incorreto — resposta: ${result.correct_answer}`}
                    </span>
                  </div>
                  {result.explanation && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.explanation}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-center text-[10px] text-muted-foreground/50 sm:hidden mb-1">
                  Deslize para avançar
                </p>
                <Button
                  className="w-full gradient-brand text-white gap-2"
                  onClick={handleNext}
                >
                  {index < questionIds.length - 1 ? (
                    <><span>Próxima questão</span><ArrowRight size={16} /></>
                  ) : (
                    <><Trophy size={16} /><span>Ver resultado</span></>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
