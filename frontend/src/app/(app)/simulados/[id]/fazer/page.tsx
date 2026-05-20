"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { QuestionCard } from "@/components/shared/QuestionCard"
import { ExamTimer } from "@/components/exams/ExamTimer"
import { QuestionGrid } from "@/components/exams/QuestionGrid"

interface Option { letter: string; text: string }
interface Question {
  id: string; subject: string; subject_label: string; topic: string | null
  difficulty: string | null; year: number | null; statement: string
  image_url: string | null; time_estimate_seconds: number; options: Option[]
}
interface ExamState {
  questions: Question[]
  durationSeconds: number
  startTime: number
  examType: string
  subject: string | null
}

const STORAGE_KEY = (id: string) => `exam_session_${id}`

export default function FazerSimuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [state, setState] = useState<ExamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startExam()
  }, [id])

  const startExam = async () => {
    try {
      const { data } = await api.post(`/exams/scheduled/${id}/start`)
      const startTime = Date.now() - data.time_elapsed_seconds * 1000
      const examState: ExamState = {
        questions: data.questions,
        durationSeconds: data.duration_minutes * 60,
        startTime,
        examType: data.exam_type,
        subject: data.subject,
      }
      setState(examState)
      localStorage.setItem(STORAGE_KEY(id), JSON.stringify({ startTime }))
      setAnswers(data.existing_answers ?? {})
      setMarked(new Set(data.marked_questions ?? []))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Erro ao iniciar simulado")
      router.push("/app/simulados")
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = useCallback((letter: string) => {
    if (!state) return
    const qid = state.questions[currentIndex].id
    const newAnswers = { ...answers, [qid]: letter }
    setAnswers(newAnswers)

    // Debounce save to Redis
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      api.put(`/exams/scheduled/${id}/save-answer`, { question_id: qid, answer: letter }).catch(() => {})
    }, 400)
  }, [state, currentIndex, answers, id])

  const handleToggleMark = async () => {
    if (!state) return
    const qid = state.questions[currentIndex].id
    const newMarked = new Set(marked)
    if (newMarked.has(qid)) newMarked.delete(qid)
    else newMarked.add(qid)
    setMarked(newMarked)
    await api.put(`/exams/scheduled/${id}/toggle-mark`, { question_id: qid }).catch(() => {})
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post(`/exams/scheduled/${id}/submit`)
      localStorage.removeItem(STORAGE_KEY(id))
      router.push(`/app/simulados/${id}/resultado`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Erro ao finalizar simulado")
      setSubmitting(false)
    }
  }

  const handleExpire = useCallback(() => {
    toast.warning("Tempo esgotado! Enviando automaticamente…")
    // Chama submit diretamente via API para evitar closure stale
    api.post(`/exams/scheduled/${id}/submit`)
      .then(() => { localStorage.removeItem(STORAGE_KEY(id)); router.push(`/app/simulados/${id}/resultado`) })
      .catch(() => {})
  }, [id, router])

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const { questions, durationSeconds, startTime } = state
  const currentQuestion = questions[currentIndex]
  const currentMarked = marked.has(currentQuestion.id)
  const answeredFlags = questions.map((q) => q.id in answers)
  const markedFlags = questions.map((q) => marked.has(q.id))
  const answeredCount = answeredFlags.filter(Boolean).length
  const unanswered = questions.length - answeredCount

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <ExamTimer
          durationSeconds={durationSeconds}
          startTime={startTime}
          onExpire={handleExpire}
        />
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length} respondidas
        </span>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${currentMarked ? "text-amber-400 border-amber-400/40" : ""}`}
          onClick={handleToggleMark}
        >
          {currentMarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {currentMarked ? "Marcada" : "Marcar"}
        </Button>
        <Button
          className="gradient-brand text-white gap-2"
          size="sm"
          onClick={() => setConfirmSubmit(true)}
          disabled={submitting}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Finalizar
        </Button>
      </div>

      <div className="flex gap-5">
        {/* Question area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-xs text-muted-foreground mb-3">
                {currentQuestion.subject_label}
                {currentQuestion.topic && ` · ${currentQuestion.topic}`}
                {currentQuestion.year && ` · ${currentQuestion.year}`}
              </div>
              <QuestionCard
                index={currentIndex}
                total={questions.length}
                statement={currentQuestion.statement}
                imageUrl={currentQuestion.image_url}
                options={currentQuestion.options}
                selectedAnswer={answers[currentQuestion.id] ?? null}
                onSelect={handleSelect}
                showResult={false}
              />
              <div className="flex justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Próxima →
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar: grid */}
        <div className="w-52 shrink-0 hidden lg:block">
          <QuestionGrid
            total={questions.length}
            currentIndex={currentIndex}
            answered={answeredFlags}
            marked={markedFlags}
            onNavigate={setCurrentIndex}
          />
        </div>
      </div>

      {/* Confirm submit overlay */}
      {confirmSubmit && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmSubmit(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold mb-2">Finalizar simulado?</h3>
              {unanswered > 0 ? (
                <p className="text-sm text-amber-400 mb-4">
                  Você tem {unanswered} questão{unanswered !== 1 ? "s" : ""} sem resposta.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Todas as questões foram respondidas.
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmSubmit(false)}>
                  Continuar
                </Button>
                <Button
                  className="flex-1 gradient-brand text-white"
                  onClick={() => { setConfirmSubmit(false); handleSubmit() }}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
                  Entregar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
