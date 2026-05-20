"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Plus, CheckCircle, Clock, PlayCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { CreateExamModal } from "@/components/exams/CreateExamModal"
import { cn } from "@/lib/utils"

interface ExamSummary {
  id: string
  exam_type: string
  subject: string | null
  total_questions: number
  duration_minutes: number
  status: string
  scheduled_at: string
  start_time: string | null
  end_time: string | null
  result_summary: { correct_answers: number; total_questions: number; raw_score: number } | null
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  complete: "Simulado Completo",
  by_subject: "Por Área",
  quiz: "Quiz Rápido",
}

const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens",
  matematica: "Matemática",
  cn: "Ciências da Natureza",
  ch: "Ciências Humanas",
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: "Agendado", icon: <Clock size={14} />, color: "text-muted-foreground" },
  started:   { label: "Em andamento", icon: <PlayCircle size={14} />, color: "text-amber-400" },
  completed: { label: "Concluído", icon: <CheckCircle size={14} />, color: "text-secondary" },
}

export default function SimuladosPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const { data } = await api.get("/exams/scheduled")
      setExams(data)
    } catch {
      toast.error("Erro ao carregar simulados")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (type: string, subject?: string) => {
    const { data } = await api.post("/exams/create", { exam_type: type, subject: subject ?? null })
    setShowModal(false)
    router.push(`/app/simulados/${data.scheduled_exam_id}/fazer`)
  }

  const handleResume = (id: string) => router.push(`/app/simulados/${id}/fazer`)
  const handleResult = (id: string) => router.push(`/app/simulados/${id}/resultado`)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList size={22} className="text-accent" />
            Simulados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pratique com simulados cronometrados
          </p>
        </div>
        <Button className="gradient-brand text-white gap-2 shrink-0" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Novo Simulado
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : !exams.length ? (
        <div className="glass rounded-2xl p-14 text-center">
          <ClipboardList size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum simulado ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Clique em "Novo Simulado" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const status = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.scheduled
            const typeLabel = EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type
            const subjectLabel = exam.subject ? ` — ${SUBJECT_LABELS[exam.subject] ?? exam.subject}` : ""

            return (
              <div key={exam.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{typeLabel}{subjectLabel}</p>
                    <span className={cn("flex items-center gap-1 text-xs", status.color)}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{exam.total_questions} questões</span>
                    <span>·</span>
                    <span>{exam.duration_minutes} min</span>
                    {exam.result_summary && (
                      <>
                        <span>·</span>
                        <span className="text-secondary font-medium">
                          {exam.result_summary.correct_answers}/{exam.result_summary.total_questions} ({exam.result_summary.raw_score}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {exam.status === "started" && (
                  <Button size="sm" className="shrink-0 gradient-brand text-white" onClick={() => handleResume(exam.id)}>
                    Continuar
                  </Button>
                )}
                {exam.status === "completed" && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleResult(exam.id)}>
                    Ver resultado
                  </Button>
                )}
                {exam.status === "scheduled" && (
                  <Button size="sm" className="shrink-0 gradient-brand text-white" onClick={() => handleResume(exam.id)}>
                    Iniciar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateExamModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
