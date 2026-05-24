"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, CheckCircle2, Clock, PlayCircle, Loader2, Target, Filter, ChevronDown, FileText, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { CreateExamModal } from "@/components/exams/CreateExamModal"

interface ExamSummary {
  id: string; exam_type: string; subject: string | null
  total_questions: number; duration_minutes: number; status: string
  scheduled_at: string; start_time: string | null; end_time: string | null
  result_summary: { correct_answers: number; total_questions: number; raw_score: number } | null
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  complete: "Simulado Completo", by_subject: "Por Área", quiz: "Quiz Rápido",
}
const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens", matematica: "Matemática", cn: "Ciências da Natureza", ch: "Ciências Humanas",
}
const SUBJECT_BADGES: Record<string, string> = {
  linguagens: "s-lin", matematica: "s-mat", cn: "s-nat", ch: "s-hum",
}

type TabFilter = "todos" | "disp" | "realiz" | "agenda"

export default function SimuladosPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tabFilter, setTabFilter] = useState<TabFilter>("todos")

  useEffect(() => { fetchExams() }, [])

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

  const completed = exams.filter(e => e.status === "completed")
  const pending = exams.filter(e => e.status !== "completed")
  const bestScore = completed.length ? Math.max(...completed.map(e => e.result_summary?.raw_score ?? 0)) : 0
  const avgScore = completed.length ? Math.round(completed.reduce((a, e) => a + (e.result_summary?.raw_score ?? 0), 0) / completed.length) : 0

  const filtered = exams.filter(e => {
    if (tabFilter === "todos") return true
    if (tabFilter === "realiz") return e.status === "completed"
    if (tabFilter === "agenda") return e.status === "scheduled"
    if (tabFilter === "disp")   return e.status !== "completed"
    return true
  })

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Estudo → Simulados</div>
            <h1 className="page-title">Simulados</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary"><Filter size={14} /> Filtrar</button>
            <button className="btn btn-brand" onClick={() => setShowModal(true)}><Plus size={14} /> Criar simulado custom</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ gap: 12, marginBottom: 24 }}>
          {[
            { label: "Realizados", value: String(completed.length) },
            { label: "Melhor nota", value: bestScore > 0 ? String(bestScore) : "—", green: true },
            { label: "Média", value: avgScore > 0 ? String(avgScore) : "—" },
            { label: "Disponíveis", value: String(pending.length) },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", marginTop: 4 }} className={s.green ? "text-gradient-green" : ""}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="row between" style={{ marginBottom: 18 }}>
          <div className="tabs">
            {([["todos", "Todos"], ["disp", "Disponíveis"], ["realiz", "Realizados"], ["agenda", "Agendados"]] as [TabFilter, string][]).map(([id, label]) => (
              <button key={id} className={`tab ${tabFilter === id ? "tab-active" : ""}`} onClick={() => setTabFilter(id)}>{label}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="chip">Duração <ChevronDown size={11} /></button>
          </div>
        </div>

        {/* Featured CTA */}
        <button onClick={() => setShowModal(true)} style={{ width: "100%", padding: 24, marginBottom: 20, borderRadius: 18, border: "1.5px dashed rgba(124, 58, 237, 0.5)", background: "radial-gradient(60% 80% at 100% 0%, rgba(124,58,237,0.12), rgba(37,99,235,0.08))", cursor: "pointer", textAlign: "left", fontFamily: "'Outfit', system-ui", color: "inherit", display: "block", transition: "all 250ms" }}>
          <div className="row" style={{ gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)" }}>
              <Target size={26} color="#fff" />
            </div>
            <div className="col" style={{ flex: 1, gap: 4 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="badge badge-premium">✦ Novo</span>
                <span className="badge badge-default">Recomendado pela IA</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>Simulado Completo ENEM</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>180 questões · 5h30 · todas as áreas · gerado com base no seu desempenho</div>
            </div>
            <button className="btn btn-brand btn-lg" onClick={e => { e.stopPropagation(); setShowModal(true) }}>
              Iniciar simulado <ArrowRight size={15} />
            </button>
          </div>
        </button>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <Target size={40} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Nenhum simulado encontrado. Clique em "Criar simulado custom" para começar.</div>
          </div>
        ) : (
          <>
            {/* Realizados */}
            {completed.length > 0 && (tabFilter === "todos" || tabFilter === "realiz") && (
              <>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Realizados</h3>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Últimos realizados</span>
                </div>
                <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
                  {completed.map(exam => {
                    const typeLabel = EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type
                    const subjectBadge = exam.subject ? SUBJECT_BADGES[exam.subject] : null
                    const dt = new Date(exam.end_time ?? exam.scheduled_at)
                    return (
                      <div key={exam.id} className="card card-hover" style={{ padding: 18, cursor: "pointer" }} onClick={() => handleResult(exam.id)}>
                        <div className="row between" style={{ marginBottom: 14 }}>
                          <span className="badge badge-success" style={{ height: 20 }}>Realizado</span>
                          <span className="mono" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        </div>
                        {exam.result_summary && (
                          <div className="row" style={{ alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }} className="text-gradient-green">
                              {exam.result_summary.raw_score}
                            </div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>/ 100</div>
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{typeLabel}</div>
                        <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
                          {subjectBadge && <span className={`badge ${subjectBadge}`} style={{ fontSize: 10.5, height: 18, padding: "0 7px" }}>{SUBJECT_LABELS[exam.subject!]}</span>}
                        </div>
                        <div className="row between" style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div className="row" style={{ gap: 10, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                            <span>{exam.total_questions} questões</span>
                            <span>·</span>
                            <span>{exam.duration_minutes} min</span>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--brand-blue-light)", fontWeight: 500 }}>Ver gabarito →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Disponíveis / Agendados */}
            {pending.length > 0 && (tabFilter === "todos" || tabFilter === "disp" || tabFilter === "agenda") && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 12 }}>
                  {tabFilter === "agenda" ? "Agendados" : "Disponíveis"}
                </h3>
                <div className="grid-2" style={{ gap: 12 }}>
                  {pending.map(exam => {
                    const typeLabel = EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type
                    const isStarted = exam.status === "started"
                    return (
                      <div key={exam.id} className="card card-hover" style={{ padding: 18 }}>
                        <div className="row between" style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{typeLabel}</div>
                          <span className={`badge ${isStarted ? "badge-amber" : "badge-default"}`}>
                            {isStarted ? "Em andamento" : "Agendado"}
                          </span>
                        </div>
                        <div className="row between" style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div className="row" style={{ gap: 10, fontSize: 12, color: "var(--muted-foreground)" }}>
                            <span><FileText size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />{exam.total_questions} questões</span>
                            <span><Clock size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />{exam.duration_minutes} min</span>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => handleResume(exam.id)}>
                            {isStarted ? <PlayCircle size={11} /> : <Target size={11} />}
                            {isStarted ? "Continuar" : "Iniciar"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showModal && (
        <CreateExamModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
