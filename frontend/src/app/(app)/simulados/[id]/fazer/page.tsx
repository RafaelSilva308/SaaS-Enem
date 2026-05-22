"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck, Loader2, X, Clock, Layers, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Option { letter: string; text: string }
interface Question {
  id: string; subject: string; subject_label: string; topic: string | null
  difficulty: string | null; year: number | null; statement: string
  image_url: string | null; time_estimate_seconds: number; options: Option[]
}
interface ExamState {
  questions: Question[]; durationSeconds: number; startTime: number
  examType: string; subject: string | null
}

const STORAGE_KEY = (id: string) => `exam_session_${id}`

const AREA_BADGE: Record<string, string> = {
  matematica: "s-mat", linguagens: "s-lin", cn: "s-nat", ch: "s-hum", redacao: "s-red",
}
const DIFF_LABEL: Record<string, string> = { easy: "Fácil", medium: "Média", hard: "Difícil" }

function useCountdown(durationSeconds: number, startTime: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const rem = Math.max(0, durationSeconds - elapsed)
      setRemaining(rem)
      if (rem === 0) onExpire()
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [durationSeconds, startTime, onExpire])
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return { display: `${pad(h)}:${pad(m)}:${pad(s)}`, remaining, isWarn: remaining < 600, isCrit: remaining < 120 }
}

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
  const [navOpen, setNavOpen] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startExam()
  }, [id])

  const startExam = async () => {
    try {
      const { data } = await api.post(`/exams/scheduled/${id}/start`)
      const startTime = Date.now() - data.time_elapsed_seconds * 1000
      setState({ questions: data.questions, durationSeconds: data.duration_minutes * 60, startTime, examType: data.exam_type, subject: data.subject })
      localStorage.setItem(STORAGE_KEY(id), JSON.stringify({ startTime }))
      setAnswers(data.existing_answers ?? {})
      setMarked(new Set(data.marked_questions ?? []))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao iniciar simulado")
      router.push("/app/simulados")
    } finally {
      setLoading(false)
    }
  }

  const handleExpire = useCallback(() => {
    toast.warning("Tempo esgotado! Enviando automaticamente…")
    api.post(`/exams/scheduled/${id}/submit`)
      .then(() => { localStorage.removeItem(STORAGE_KEY(id)); router.push(`/app/simulados/${id}/resultado`) })
      .catch(() => {})
  }, [id, router])

  const timer = useCountdown(state?.durationSeconds ?? 0, state?.startTime ?? Date.now(), handleExpire)

  const handleSelect = useCallback((letter: string) => {
    if (!state) return
    const qid = state.questions[currentIndex].id
    const newAnswers = { ...answers, [qid]: letter }
    setAnswers(newAnswers)
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
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao finalizar simulado")
      setSubmitting(false)
    }
  }

  if (loading || !state) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  const { questions } = state
  const currentQuestion = questions[currentIndex]
  const currentMarked = marked.has(currentQuestion.id)
  const answeredCount = questions.filter(q => q.id in answers).length
  const unanswered = questions.length - answeredCount
  const progress = ((currentIndex + 1) / questions.length) * 100
  const selectedAnswer = answers[currentQuestion.id] ?? null

  const areaClass = AREA_BADGE[currentQuestion.subject] ?? "badge-default"
  const diffLabel = DIFF_LABEL[currentQuestion.difficulty ?? "medium"] ?? "Média"
  const diffColor = currentQuestion.difficulty === "easy" ? "#6ee7b7" : currentQuestion.difficulty === "hard" ? "#fca5a5" : "#fcd34d"

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--background)", zIndex: 50, display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div className="row between" style={{ padding: "14px 28px", borderBottom: "1px solid var(--border)", background: "rgba(10, 18, 38, 0.85)", backdropFilter: "blur(20px)" }}>
        <div className="row" style={{ gap: 14 }}>
          <button className="btn btn-icon" onClick={() => router.push("/app/simulados")}><X size={15} /></button>
          <div className="col" style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>SIMULADO</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Questão {currentIndex + 1} de {questions.length}</div>
          </div>
        </div>

        <div className="col" style={{ flex: 1, maxWidth: 400, margin: "0 32px", gap: 4 }}>
          <div className="row between" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            <span>{answeredCount} respondidas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(30,41,59,0.6)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 999, transition: "width 300ms" }} />
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, padding: "8px 14px", borderRadius: 12, background: timer.isCrit ? "rgba(239,68,68,0.12)" : timer.isWarn ? "rgba(245,158,11,0.12)" : "rgba(15,23,42,0.6)", border: `1px solid ${timer.isCrit ? "rgba(239,68,68,0.4)" : timer.isWarn ? "rgba(245,158,11,0.4)" : "var(--border)"}` }}>
            <Clock size={15} color={timer.isCrit ? "#fca5a5" : timer.isWarn ? "#fcd34d" : "currentColor"} />
            <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: timer.isCrit ? "#fca5a5" : timer.isWarn ? "#fcd34d" : "var(--foreground)" }}>
              {timer.display}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={() => setNavOpen(true)}>
            <Layers size={14} /> Navegador
          </button>
          <button className="btn btn-brand" onClick={() => setConfirmSubmit(true)}>Finalizar simulado</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px" }}>
          <div className="row" style={{ gap: 10, marginBottom: 18 }}>
            <span className={`badge ${areaClass}`}>{currentQuestion.subject_label}</span>
            {currentQuestion.year && <span className="badge badge-default mono">ENEM {currentQuestion.year}</span>}
            <span style={{ fontSize: 11.5, fontWeight: 600, color: diffColor }}>{diffLabel}</span>
            <button className="btn btn-icon" style={{ marginLeft: "auto" }} onClick={handleToggleMark} aria-label="Marcar">
              {currentMarked
                ? <BookmarkCheck size={15} color="#fcd34d" />
                : <Bookmark size={15} />
              }
            </button>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.75, color: "#e2e8f0", marginBottom: 18 }}>
            {currentQuestion.statement}
          </p>

          {currentQuestion.image_url && (
            <div className="placeholder-img" style={{ height: 180, marginBottom: 24 }}>
              [Imagem da questão]
            </div>
          )}

          <div className="col" style={{ gap: 10 }}>
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt.letter
              return (
                <button
                  key={opt.letter}
                  className={`answer-row${isSelected ? " selected" : ""}`}
                  onClick={() => handleSelect(opt.letter)}
                >
                  <span className="letter">{opt.letter}</span>
                  <span style={{ flex: 1 }}>{opt.text}</span>
                </button>
              )
            })}
          </div>

          <div className="row between" style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <button className="btn btn-secondary" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
              <Bookmark size={12} /> Marcar para revisão <span className="kbd">M</span>
            </div>
            <button className="btn btn-primary" onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1}>
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigator drawer */}
      {navOpen && (
        <div className="anim-fade" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setNavOpen(false)} />
          <div className="glass-strong anim-slide-up" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, padding: "24px", overflowY: "auto" }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Navegador de Questões</h3>
              <button className="btn btn-icon" onClick={() => setNavOpen(false)}><X size={14} /></button>
            </div>
            <div className="row" style={{ gap: 14, fontSize: 11.5, color: "var(--muted-foreground)", marginBottom: 16, flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "rgba(16,185,129,0.25)", border: "1px solid rgba(16,185,129,0.5)" }} />Respondida</div>
              <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "rgba(245,158,11,0.25)", border: "1px solid rgba(245,158,11,0.5)" }} />Marcada</div>
              <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 4, background: "rgba(30,41,59,0.7)", border: "1px solid var(--border-strong)" }} />Pendente</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
              {questions.map((q, i) => {
                const isAnswered = q.id in answers
                const isMarked = marked.has(q.id)
                const isCurrent = i === currentIndex
                const bg = isCurrent ? "rgba(37,99,235,0.4)" : isAnswered ? "rgba(16,185,129,0.2)" : isMarked ? "rgba(245,158,11,0.2)" : "rgba(30,41,59,0.5)"
                const brd = isCurrent ? "var(--primary)" : isAnswered ? "rgba(16,185,129,0.5)" : isMarked ? "rgba(245,158,11,0.5)" : "var(--border)"
                return (
                  <button key={q.id} onClick={() => { setCurrentIndex(i); setNavOpen(false) }} className="mono"
                    style={{ aspectRatio: "1", borderRadius: 6, background: bg, border: `1px solid ${brd}`, color: "var(--foreground)", fontSize: 10.5, cursor: "pointer", fontFamily: "JetBrains Mono", fontWeight: 500 }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm submit */}
      {confirmSubmit && (
        <div className="anim-fade" style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.78)", backdropFilter: "blur(8px)", zIndex: 70, display: "grid", placeItems: "center", padding: 24 }}>
          <div className="glass-strong anim-scale" style={{ borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 12 }}>Finalizar simulado?</h3>
            {unanswered > 0 ? (
              <p style={{ fontSize: 13.5, color: "#fcd34d", marginBottom: 20 }}>
                Você tem {unanswered} questão{unanswered !== 1 ? "s" : ""} sem resposta.
              </p>
            ) : (
              <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
                Todas as questões foram respondidas. Boa sorte!
              </p>
            )}
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmSubmit(false)}>Continuar</button>
              <button className="btn btn-brand" style={{ flex: 1 }} onClick={() => { setConfirmSubmit(false); handleSubmit() }} disabled={submitting}>
                {submitting ? <span className="spinner" /> : null}
                Entregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
