"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PenLine, Loader2, BookOpen, CheckCircle, Clock, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ThemeCard } from "@/components/essays/ThemeCard"
import { cn } from "@/lib/utils"

interface Theme {
  id: string; title: string; description: string | null; year: number | null; source: string | null
}
interface EssayItem {
  id: string; theme_title: string | null; word_count: number | null; line_count: number | null
  status: string; submitted_at: string | null; created_at: string; ai_score: number | null
}

type Tab = "temas" | "minhas"

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  draft:        { label: "Rascunho",    icon: <Clock size={13} />,       color: "text-muted-foreground" },
  submitted:    { label: "Enviada",     icon: <Send size={13} />,        color: "text-amber-400" },
  under_review: { label: "Analisando…", icon: <Loader2 size={13} className="animate-spin" />, color: "text-amber-400" },
  reviewed:     { label: "Corrigida",   icon: <CheckCircle size={13} />, color: "text-secondary" },
}

function scoreColor(score: number) {
  if (score >= 800) return "#2563eb"
  if (score >= 600) return "#10b981"
  if (score >= 400) return "#f59e0b"
  return "#ef4444"
}

export default function RedacaoPage() {
  const router  = useRouter()
  const [tab, setTab]       = useState<Tab>("temas")
  const [themes, setThemes] = useState<Theme[]>([])
  const [essays, setEssays] = useState<EssayItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/essays/themes"),
      api.get("/essays"),
    ])
      .then(([tRes, eRes]) => {
        setThemes(tRes.data.themes)
        setEssays(eRes.data)
      })
      .catch(() => toast.error("Erro ao carregar dados"))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTheme = async (theme: Theme) => {
    try {
      const { data } = await api.post("/essays", {
        theme_id: theme.id,
        theme_title: theme.title,
      })
      router.push(`/app/redacao/escrever?essayId=${data.essay_id}`)
    } catch {
      toast.error("Erro ao criar redação")
    }
  }

  const handleEssayClick = (essay: EssayItem) => {
    if (essay.status === "reviewed") {
      router.push(`/app/redacao/${essay.id}`)
    } else if (essay.status === "draft") {
      router.push(`/app/redacao/escrever?essayId=${essay.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine size={22} className="text-accent" />
            Redação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Treine com temas oficiais do ENEM e receba correção por IA
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-sm rounded-xl w-fit">
        {[
          { id: "temas" as Tab,  label: "Temas" },
          { id: "minhas" as Tab, label: `Minhas Redações${essays.length ? ` (${essays.length})` : ""}` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Temas */}
      {tab === "temas" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((t) => (
            <ThemeCard key={t.id} theme={t} onSelect={handleSelectTheme} />
          ))}
        </div>
      )}

      {/* Minhas redações */}
      {tab === "minhas" && (
        essays.length === 0 ? (
          <div className="glass rounded-2xl p-14 text-center">
            <BookOpen size={40} className="text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma redação ainda.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Escolha um tema na aba "Temas" para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {essays.map((e) => {
              const status = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.draft
              const canClick = e.status === "draft" || e.status === "reviewed"
              return (
                <div
                  key={e.id}
                  className={cn(
                    "glass rounded-xl p-4 flex items-center gap-4",
                    canClick && "cursor-pointer hover:border-primary/20 transition-colors",
                  )}
                  onClick={() => canClick && handleEssayClick(e)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">
                      {e.theme_title ?? "Tema livre"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className={cn("flex items-center gap-1", status.color)}>
                        {status.icon}{status.label}
                      </span>
                      {e.word_count && <span>{e.word_count} palavras</span>}
                      {e.line_count && <span>{e.line_count} linhas</span>}
                      <span>{new Date(e.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  {e.ai_score != null && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(e.ai_score) }}>
                        {e.ai_score}
                      </p>
                      <p className="text-[11px] text-muted-foreground">/ 1000</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
