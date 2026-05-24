"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Search, Filter, Bookmark, Sparkles, ChevronDown, ArrowRight, Users, Check, X, Brain } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { StudyMode } from "@/components/questions/StudyMode"

type Tab = "recommended" | "all" | "doubts"

interface QuestionItem {
  id: string; subject: string; subject_label: string; topic: string | null
  difficulty: string | null; year: number | null; source: string | null
  statement_preview: string; time_estimate_seconds: number
  stat: { attempts: number; correct: number; wrong: number; marked_as_doubt: boolean } | null
}
interface ListData {
  questions: QuestionItem[]; total: number; page: number; per_page: number; total_pages: number
}
interface Filters { subject: string; difficulty: string; year: string; source: string }

const EMPTY_FILTERS: Filters = { subject: "", difficulty: "", year: "", source: "" }

const AREA_MAP: Record<string, string> = {
  matematica: "s-mat", linguagens: "s-lin", cn: "s-nat", ch: "s-hum", redacao: "s-red",
}

function difficultyColor(diff: string | null) {
  if (diff === "easy")   return "#6ee7b7"
  if (diff === "hard")   return "#fca5a5"
  return "#fcd34d"
}
function difficultyLabel(diff: string | null) {
  if (diff === "easy")   return "Fácil"
  if (diff === "hard")   return "Difícil"
  return "Média"
}

export default function BancoQuestoesPage() {
  const [tab, setTab] = useState<Tab>("recommended")
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState(false)
  const [studyIds, setStudyIds] = useState<string[]>([])
  const [activeArea, setActiveArea] = useState("todas")

  const fetchQuestions = useCallback(async (currentTab: Tab, currentFilters: Filters, currentPage: number) => {
    setLoading(true)
    try {
      let url = ""
      const params = new URLSearchParams()
      if (currentTab === "recommended") {
        url = "/questions/recommended"; params.set("limit", "20")
      } else if (currentTab === "doubts") {
        url = "/questions/doubts"
      } else {
        url = "/questions"; params.set("page", String(currentPage)); params.set("per_page", "12")
        if (currentFilters.subject) params.set("subject", currentFilters.subject)
        if (currentFilters.difficulty) params.set("difficulty", currentFilters.difficulty)
        if (currentFilters.year) params.set("year", currentFilters.year)
        if (currentFilters.source) params.set("source", currentFilters.source)
      }
      const qs = params.toString()
      const { data: res } = await api.get(`${url}${qs ? "?" + qs : ""}`)
      setData(res)
    } catch {
      toast.error("Erro ao carregar questões")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuestions(tab, filters, page) }, [tab, filters, page, fetchQuestions])

  const handleTabChange = (t: Tab) => { setTab(t); setPage(1); setFilters(EMPTY_FILTERS) }

  const handleStartStudy = (startId?: string) => {
    const ids = data?.questions.map(q => q.id) ?? []
    if (!ids.length) { toast.error("Nenhuma questão disponível"); return }
    const startIndex = startId ? ids.indexOf(startId) : 0
    const ordered = startIndex > 0 ? [...ids.slice(startIndex), ...ids.slice(0, startIndex)] : ids
    setStudyIds(ordered); setStudyMode(true)
  }

  const handleToggleDoubt = async (id: string) => {
    try {
      await api.post(`/questions/${id}/mark-doubt`)
      fetchQuestions(tab, filters, page)
    } catch { toast.error("Erro ao atualizar dúvida") }
  }

  if (studyMode) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--background)", overflow: "auto" }}>
        <StudyMode questionIds={studyIds} onClose={() => { setStudyMode(false); fetchQuestions(tab, filters, page) }} />
      </div>
    )
  }

  const areas = [
    { id: "todas", label: "Todas", count: data?.total ?? 0 },
    { id: "matematica", label: "Matemática", count: 0 },
    { id: "linguagens", label: "Linguagens", count: 0 },
    { id: "cn", label: "Ciências da Natureza", count: 0 },
    { id: "ch", label: "Ciências Humanas", count: 0 },
  ]

  const doubletsCount = data?.questions.filter(q => q.stat?.marked_as_doubt).length ?? 0

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Page Header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Estudo → Banco de Questões</div>
            <h1 className="page-title">Banco de Questões</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => handleTabChange("doubts")}>
              <Bookmark size={14} /> Marcadas ({doubletsCount})
            </button>
            <button className="btn btn-primary" onClick={() => handleStartStudy()}>
              <Sparkles size={14} /> Sessão IA
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="row" style={{ gap: 10, marginBottom: 12 }}>
            <div className="input-icon-wrap" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                className="input"
                placeholder="Buscar por tema, palavra-chave, número de questão..."
                style={{ height: 40 }}
                onChange={e => {
                  // Debounced: just update filter for now
                }}
              />
            </div>
            <button className="btn btn-icon" aria-label="Filtros"><Filter size={15} /></button>
          </div>

          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {areas.map(a => (
              <button
                key={a.id}
                className={`chip ${activeArea === a.id ? "chip-active" : ""}`}
                onClick={() => {
                  setActiveArea(a.id)
                  setFilters({ ...EMPTY_FILTERS, subject: a.id === "todas" ? "" : a.id })
                  setPage(1)
                  setTab("all")
                }}
              >
                {a.label}
              </button>
            ))}
            <div style={{ width: 1, background: "var(--border)", margin: "2px 4px", alignSelf: "stretch" }} />
            <button className="chip">
              Ano: Todos <ChevronDown size={12} />
            </button>
            <button className="chip" onClick={() => setFilters(f => ({ ...f, difficulty: f.difficulty === "hard" ? "" : "hard" }))}>
              Dificuldade <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Tabs + stats */}
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="tabs">
            {[
              { id: "recommended" as Tab, label: "Recomendadas" },
              { id: "all" as Tab, label: "Todas" },
              { id: "doubts" as Tab, label: "Dúvidas" },
            ].map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? "tab-active" : ""}`} onClick={() => handleTabChange(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {data && (
            <div className="row" style={{ gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
              <span>{data.total} questões</span>
              <span>·</span>
              <span style={{ color: "#6ee7b7" }}>{data.questions.filter(q => q.stat?.correct).length} resolvidas</span>
              <span>·</span>
              <span style={{ color: "#fca5a5" }}>{data.questions.filter(q => q.stat?.wrong).length} erradas</span>
            </div>
          )}
        </div>

        {/* Questions grid */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={28} />
          </div>
        ) : !data?.questions.length ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <Brain size={40} style={{ color: "var(--muted-foreground)", opacity: 0.4, margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
              {tab === "doubts" ? "Nenhuma questão marcada como dúvida ainda."
               : tab === "recommended" ? "Complete o diagnóstico para receber recomendações."
               : "Nenhuma questão encontrada com esses filtros."}
            </div>
          </div>
        ) : (
          <>
            <div className="grid-2" style={{ gap: 12, marginBottom: 24 }}>
              {data.questions.map(q => {
                const hasCorrect = q.stat && q.stat.correct > 0
                const hasWrong = q.stat && q.stat.wrong > 0 && !hasCorrect
                const isDoubt = q.stat?.marked_as_doubt
                const areaClass = AREA_MAP[q.subject] ?? "badge-default"
                const timeMin = Math.ceil((q.time_estimate_seconds ?? 120) / 60)
                return (
                  <button
                    key={q.id}
                    onClick={() => handleStartStudy(q.id)}
                    className="card card-hover"
                    style={{ padding: 18, textAlign: "left", cursor: "pointer", fontFamily: "'Outfit', system-ui", color: "inherit", display: "block", width: "100%" }}
                  >
                    <div className="row between" style={{ marginBottom: 12 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <span className={`badge ${areaClass}`}>{q.subject_label}</span>
                        {q.year && <span className="badge badge-default mono">ENEM {q.year}</span>}
                      </div>
                      <div className="row" style={{ gap: 4 }}>
                        {hasCorrect && <span className="badge badge-success" style={{ height: 20 }}><Check size={10} /> Resolvida</span>}
                        {hasWrong && <span className="badge badge-destructive" style={{ height: 20 }}><X size={10} /> Errada</span>}
                        {isDoubt && !hasCorrect && !hasWrong && <span className="badge badge-amber" style={{ height: 20 }}>Dúvida</span>}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>
                      {q.difficulty ? `${difficultyLabel(q.difficulty)}` : "Média"} · {timeMin} min
                      {q.topic && ` · ${q.topic}`}
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#cbd5e1", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {q.statement_preview}
                    </p>
                    <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                      <div className="row" style={{ gap: 6, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                        {q.stat && <><Users size={11} /> {q.stat.attempts} tentativas · </>}
                        {q.stat && q.stat.attempts > 0 && <span>{Math.round((q.stat.correct / q.stat.attempts) * 100)}% acerto</span>}
                      </div>
                      <div className="row" style={{ gap: 4, fontSize: 12, color: "var(--brand-blue-light)", fontWeight: 500 }}>
                        Resolver <ArrowRight size={11} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Skeleton for "load more" feel */}
            {tab === "all" && (
              <div className="grid-2" style={{ gap: 12, marginBottom: 24 }}>
                {[1, 2].map(i => (
                  <div key={i} className="card" style={{ padding: 18, opacity: 0.4 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                      <div className="skeleton" style={{ width: 60, height: 18 }} /><div className="skeleton" style={{ width: 80, height: 18 }} />
                    </div>
                    <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: "85%", height: 14, marginBottom: 12 }} />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {tab === "all" && data.total_pages > 1 && (
              <div className="row center" style={{ gap: 8, marginTop: 16 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
                {Array.from({ length: Math.min(data.total_pages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`btn btn-sm ${p === page ? "btn-primary" : "btn-ghost"}`} style={{ minWidth: 36 }}>
                    {p}
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>Próxima →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
