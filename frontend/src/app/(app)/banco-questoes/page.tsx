"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, BookOpen, GraduationCap } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { FilterPanel, type Filters } from "@/components/questions/FilterPanel"
import { QuestionListItem } from "@/components/questions/QuestionListItem"
import { StudyMode } from "@/components/questions/StudyMode"
import { cn } from "@/lib/utils"

type Tab = "recommended" | "all" | "doubts"

interface QuestionItem {
  id: string
  subject: string
  subject_label: string
  topic: string | null
  difficulty: string | null
  year: number | null
  source: string | null
  statement_preview: string
  time_estimate_seconds: number
  stat: { attempts: number; correct: number; wrong: number; marked_as_doubt: boolean } | null
}

interface ListData {
  questions: QuestionItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

const EMPTY_FILTERS: Filters = { subject: "", difficulty: "", year: "", source: "" }
const TABS: { id: Tab; label: string }[] = [
  { id: "recommended", label: "Recomendadas" },
  { id: "all", label: "Todas" },
  { id: "doubts", label: "Dúvidas" },
]

export default function BancoQuestoesPage() {
  const [tab, setTab] = useState<Tab>("recommended")
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [studyMode, setStudyMode] = useState(false)
  const [studyIds, setStudyIds] = useState<string[]>([])

  const fetchQuestions = useCallback(async (
    currentTab: Tab,
    currentFilters: Filters,
    currentPage: number,
  ) => {
    setLoading(true)
    try {
      let url = ""
      const params = new URLSearchParams()

      if (currentTab === "recommended") {
        url = "/questions/recommended"
        params.set("limit", "20")
      } else if (currentTab === "doubts") {
        url = "/questions/doubts"
      } else {
        url = "/questions"
        params.set("page", String(currentPage))
        params.set("per_page", "10")
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

  useEffect(() => {
    fetchQuestions(tab, filters, page)
  }, [tab, filters, page, fetchQuestions])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setPage(1)
    setFilters(EMPTY_FILTERS)
  }

  const handleFilterChange = (f: Filters) => {
    setFilters(f)
    setPage(1)
  }

  const handleStartStudy = (startId?: string) => {
    const ids = data?.questions.map((q) => q.id) ?? []
    if (!ids.length) { toast.error("Nenhuma questão disponível"); return }
    const startIndex = startId ? ids.indexOf(startId) : 0
    const orderedIds = startIndex > 0 ? [...ids.slice(startIndex), ...ids.slice(0, startIndex)] : ids
    setStudyIds(orderedIds)
    setStudyMode(true)
  }

  const handleToggleDoubt = async (id: string) => {
    try {
      await api.post(`/questions/${id}/mark-doubt`)
      fetchQuestions(tab, filters, page)
    } catch {
      toast.error("Erro ao atualizar dúvida")
    }
  }

  // Study Mode — full screen
  if (studyMode) {
    return (
      <div className="max-w-2xl mx-auto pt-4">
        <StudyMode
          questionIds={studyIds}
          onClose={() => { setStudyMode(false); fetchQuestions(tab, filters, page) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap size={22} className="text-primary" />
            Banco de Questões
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} questão${data.total !== 1 ? "s" : ""} disponível${data.total !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
        </div>
        <Button
          className="gradient-brand text-white gap-2 shrink-0"
          onClick={() => handleStartStudy()}
          disabled={!data?.questions.length}
        >
          <BookOpen size={16} />
          Modo Estudo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-sm rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Filters — only visible on "all" tab */}
        {tab === "all" && (
          <div className="w-52 shrink-0 hidden lg:block">
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onClear={() => handleFilterChange(EMPTY_FILTERS)}
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : !data?.questions.length ? (
            <div className="glass rounded-2xl p-12 text-center">
              <BookOpen size={40} className="text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {tab === "doubts"
                  ? "Nenhuma questão marcada como dúvida ainda."
                  : tab === "recommended"
                  ? "Complete o diagnóstico para receber recomendações."
                  : "Nenhuma questão encontrada com esses filtros."}
              </p>
            </div>
          ) : (
            <>
              {data.questions.map((q) => (
                <QuestionListItem
                  key={q.id}
                  question={q}
                  onStudy={(id) => handleStartStudy(id)}
                  onToggleDoubt={handleToggleDoubt}
                />
              ))}

              {/* Pagination — only for "all" tab */}
              {tab === "all" && data.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </Button>
                  {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "ghost"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
