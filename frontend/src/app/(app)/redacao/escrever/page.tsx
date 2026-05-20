"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Send, Timer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EssayData {
  id: string
  theme_title: string | null
  theme_id: string | null
  text: string
  word_count: number | null
  line_count: number | null
  status: string
}

interface ThemeData {
  id: string
  title: string
  description: string | null
  year: number | null
}

const MIN_LINES = 7
const MAX_LINES = 30
const TARGET_WORDS = 300

// Simple countdown timer hook
function useTimer(initialSeconds: number, enabled: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || !enabled) return
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [running, seconds, enabled])

  const pad = (n: number) => String(n).padStart(2, "0")
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const display = `${pad(m)}:${pad(s)}`
  const isUrgent   = seconds < 300 && seconds > 60
  const isCritical = seconds <= 60

  return { display, running, setRunning, isUrgent, isCritical, done: seconds <= 0 }
}

export default function EscreverPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const essayId      = searchParams.get("essayId")

  const [essay, setEssay]       = useState<EssayData | null>(null)
  const [theme, setTheme]       = useState<ThemeData | null>(null)
  const [text, setText]         = useState("")
  const [saving, setSaving]     = useState(false)
  const [savedAt, setSavedAt]   = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [showTimer, setShowTimer] = useState(false)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timer30min = useTimer(30 * 60, showTimer)

  useEffect(() => {
    if (!essayId) { router.push("/app/redacao"); return }
    api.get(`/essays/${essayId}`)
      .then(({ data }) => {
        setEssay(data)
        setText(data.text || "")
        if (data.theme_id) {
          api.get("/essays/themes").then(({ data: td }) => {
            const t = td.themes.find((t: ThemeData) => t.id === data.theme_id)
            if (t) setTheme(t)
          }).catch(() => {})
        }
      })
      .catch(() => { toast.error("Redação não encontrada"); router.push("/app/redacao") })
      .finally(() => setLoading(false))
  }, [essayId, router])

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const lineCount = text ? text.split("\n").filter((l) => l.trim()).length : 0

  const saveDebounced = useCallback((newText: string) => {
    if (!essayId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await api.put(`/essays/${essayId}`, {
          text: newText,
          word_count: newText.trim() ? newText.trim().split(/\s+/).length : 0,
          line_count: newText ? newText.split("\n").filter((l) => l.trim()).length : 0,
        })
        setSavedAt(new Date())
      } catch { /* silently ignore auto-save errors */ }
      finally { setSaving(false) }
    }, 1500)
  }, [essayId])

  const handleChange = (val: string) => {
    setText(val)
    saveDebounced(val)
  }

  const handleSubmit = async () => {
    if (wordCount < 50) { toast.error("A redação está muito curta (mínimo 50 palavras)"); return }
    setSubmitting(true)
    try {
      // Final save before submit
      if (essayId) {
        await api.put(`/essays/${essayId}`, {
          text, word_count: wordCount, line_count: lineCount,
        })
      }
      await api.post(`/essays/${essayId}/submit`)
      toast.success("Redação enviada! Aguarde a análise...")
      router.push(`/app/redacao/${essayId}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Erro ao enviar redação")
      setSubmitting(false)
    }
  }

  const wordColor =
    wordCount < 150 ? "#ef4444" :
    wordCount < 250 ? "#f59e0b" :
    wordCount <= 350 ? "#10b981" : "#f59e0b"

  const lineWarning = lineCount < MIN_LINES
    ? `Mínimo ${MIN_LINES} linhas (${lineCount})`
    : lineCount > MAX_LINES
    ? `Máximo ${MAX_LINES} linhas (${lineCount})`
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-3 max-w-6xl">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/app/redacao")}>
          <ArrowLeft size={15} className="mr-1" /> Temas
        </Button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{essay?.theme_title ?? "Redação"}</p>
        </div>

        {/* Timer toggle */}
        <button
          onClick={() => { setShowTimer((v) => { if (!v) timer30min.setRunning(true); return !v }); }}
          className={cn(
            "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors",
            showTimer
              ? timer30min.isCritical ? "border-destructive text-destructive animate-pulse"
              : timer30min.isUrgent ? "border-amber-400 text-amber-400"
              : "border-secondary text-secondary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Timer size={14} />
          {showTimer ? timer30min.display : "30 min"}
        </button>

        {/* Auto-save status */}
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
          {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> :
           savedAt ? <><Save size={12} className="text-secondary" /> Salvo</> :
           null}
        </span>

        <Button
          className="gradient-brand text-white gap-2 shrink-0"
          onClick={handleSubmit}
          disabled={submitting || wordCount < 50}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar para correção
        </Button>
      </div>

      {/* Split pane */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left: theme proposal */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proposta
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {theme ? (
              <div className="space-y-3">
                {theme.year && (
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    ENEM {theme.year}
                  </span>
                )}
                <p className="text-sm font-semibold leading-snug">{theme.title}</p>
                {theme.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {theme.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{essay?.theme_title}</p>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 min-w-0 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sua redação
            </p>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span style={{ color: wordColor }} className="font-medium">
                {wordCount} palavras
              </span>
              <span className={cn(
                "font-medium",
                lineWarning ? "text-amber-400" : "text-muted-foreground",
              )}>
                {lineWarning ?? `${lineCount} linhas`}
              </span>
              <span className="text-muted-foreground/50">meta: ~{TARGET_WORDS} palavras</span>
            </div>
          </div>

          <textarea
            className="flex-1 p-5 bg-transparent resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 focus:outline-none font-mono"
            placeholder="Escreva sua introdução aqui…&#10;&#10;Organize o texto em parágrafos claros.&#10;Lembre-se da proposta de intervenção na conclusão."
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
