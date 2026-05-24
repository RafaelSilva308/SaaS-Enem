"use client"

import { useCallback, useEffect, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Clock, Send, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface EssayData { id: string; theme_title: string | null; theme_id: string | null; text: string; word_count: number | null; line_count: number | null; status: string }
interface ThemeData { id: string; title: string; description: string | null; year: number | null }

const MIN_LINES = 7, MAX_LINES = 30

function EscreverPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const essayId = searchParams.get("essayId")

  const [essay, setEssay] = useState<EssayData | null>(null)
  const [theme, setTheme] = useState<ThemeData | null>(null)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(false)
  const [timerSec, setTimerSec] = useState(30 * 60)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!essayId) { router.push("/app/redacao"); return }
    api.get(`/essays/${essayId}`)
      .then(({ data }) => {
        setEssay(data); setText(data.text || "")
        if (data.theme_id) {
          api.get("/essays/themes").then(({ data: td }) => {
            const t = td.themes.find((th: ThemeData) => th.id === data.theme_id)
            if (t) setTheme(t)
          }).catch(() => {})
        }
      })
      .catch(() => { toast.error("Redação não encontrada"); router.push("/app/redacao") })
      .finally(() => setLoading(false))
  }, [essayId, router])

  const handleTimer = () => {
    if (!showTimer) {
      setShowTimer(true)
      timerRef.current = setInterval(() => setTimerSec(s => { if (s <= 1) { clearInterval(timerRef.current!); return 0 } return s - 1 }), 1000)
    } else {
      setShowTimer(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const lines = text ? text.split("\n").filter(l => l.trim()).length : 0
  const chars = text.length
  const lineWarning = lines > MAX_LINES

  const saveDebounced = useCallback((newText: string) => {
    if (!essayId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await api.put(`/essays/${essayId}`, { text: newText, word_count: newText.trim() ? newText.trim().split(/\s+/).length : 0, line_count: newText ? newText.split("\n").filter(l => l.trim()).length : 0 })
        setSavedAt(new Date())
      } catch { /* silently ignore */ }
      finally { setSaving(false) }
    }, 1500)
  }, [essayId])

  const handleChange = (val: string) => { setText(val); saveDebounced(val) }

  const handleSubmit = async () => {
    if (words < 50) { toast.error("A redação está muito curta (mínimo 50 palavras)"); return }
    setSubmitting(true)
    try {
      if (essayId) await api.put(`/essays/${essayId}`, { text, word_count: words, line_count: lines })
      await api.post(`/essays/${essayId}/submit`)
      toast.success("Redação enviada! Aguarde a análise...")
      router.push(`/app/redacao/${essayId}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao enviar redação")
      setSubmitting(false)
    }
  }

  const tSec = timerSec
  const tPad = (n: number) => String(n).padStart(2, "0")
  const timerDisplay = `${tPad(Math.floor(tSec / 60))}:${tPad(tSec % 60)}`
  const timerWarn = tSec < 300
  const timerCrit = tSec <= 60

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--background)", zIndex: 40, display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div className="row between" style={{ padding: "14px 28px", borderBottom: "1px solid var(--border)", background: "rgba(10, 18, 38, 0.85)", backdropFilter: "blur(20px)" }}>
        <div className="row" style={{ gap: 14 }}>
          <button className="btn btn-icon" onClick={() => router.push("/app/redacao")}><ChevronLeft size={15} /></button>
          <div className="col" style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>REDAÇÃO · TEMA DO DIA</div>
            <div style={{ fontSize: 14, fontWeight: 600, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {essay?.theme_title ?? "Redação"}
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, fontSize: 12 }}>
          <div className="row" style={{ gap: 6, color: "var(--muted-foreground)" }}>
            {saving
              ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Salvando…</>
              : savedAt
              ? <><Check size={13} color="#6ee7b7" /> Salvo automaticamente</>
              : null
            }
          </div>
          <div className="row" style={{ gap: 14, color: "var(--muted-foreground)" }}>
            <span className="mono">Linhas: <strong style={{ color: lineWarning ? "#fca5a5" : "var(--foreground)" }}>{lines}</strong>/30</span>
            <span className="mono">Palavras: <strong style={{ color: "var(--foreground)" }}>{words}</strong></span>
            <span className="mono">Carac: <strong style={{ color: "var(--foreground)" }}>{chars}</strong></span>
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleTimer} style={{ borderColor: showTimer ? (timerCrit ? "rgba(239,68,68,0.4)" : timerWarn ? "rgba(245,158,11,0.4)" : "rgba(37,99,235,0.3)") : undefined, color: showTimer ? (timerCrit ? "#fca5a5" : timerWarn ? "#fcd34d" : "var(--brand-blue-light)") : undefined }}>
            <Clock size={13} />
            {showTimer ? timerDisplay : "Ativar timer"}
          </button>
          <button className="btn btn-violet" onClick={handleSubmit} disabled={submitting || words < 50}>
            {submitting ? <span className="spinner" /> : <Send size={14} />}
            Enviar para correção
          </button>
        </div>
      </div>

      {/* Body — split */}
      <div className="grid-editor" style={{ flex: 1, overflow: "hidden" }}>
        {/* Theme panel */}
        <div style={{ overflowY: "auto", padding: "28px 32px", borderRight: "1px solid var(--border)", background: "rgba(15, 23, 42, 0.3)" }}>
          <span className="badge badge-premium" style={{ marginBottom: 12 }}>✦ Tema oficial</span>
          <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 20 }}>
            {theme?.title ?? essay?.theme_title}
          </h2>

          {theme?.description && (
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#bfdbfe", marginBottom: 6 }}>Proposta</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", margin: 0 }}>{theme.description}</p>
            </div>
          )}

          <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginTop: 20, marginBottom: 10 }}>
            Estrutura sugerida
          </div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { n: 1, t: "Introdução", d: "Apresente o tema e sua tese" },
              { n: 2, t: "Desenvolvimento I", d: "Argumento 1 com dados e citação" },
              { n: 3, t: "Desenvolvimento II", d: "Argumento 2 com contraponto" },
              { n: 4, t: "Conclusão", d: "Proposta de intervenção (5 elementos)" },
            ].map((s) => (
              <div key={s.n} className="row" style={{ gap: 10, padding: "10px 12px", background: "rgba(15,23,42,0.4)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ width: 22, height: 22, borderRadius: 8, background: "rgba(124,58,237,0.18)", color: "#c4b5fd", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.n}</div>
                <div className="col" style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.t}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor panel */}
        <div style={{ overflowY: "auto", padding: "32px 56px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div className="row between" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>SUA REDAÇÃO</div>
            </div>
            <textarea
              className="input"
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={"Escreva sua introdução aqui…\n\nOrganize o texto em parágrafos claros.\nLembre-se da proposta de intervenção na conclusão."}
              spellCheck={false}
              style={{ fontFamily: "'Outfit', 'Iowan Old Style', Georgia, serif", fontSize: 17, lineHeight: 1.85, minHeight: 500, border: "none", background: "transparent", padding: 0, resize: "none" }}
            />

            {/* AI tip */}
            <div className="card card-premium" style={{ padding: 14, marginTop: 18 }}>
              <div className="row" style={{ gap: 10 }}>
                <Sparkles size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="col" style={{ lineHeight: 1.4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#c4b5fd" }}>Sugestão da IA enquanto você escreve</div>
                  <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 2 }}>
                    {words < 100
                      ? "Continue escrevendo — apresente o tema e sua tese de forma clara na introdução."
                      : words < 250
                      ? "Bom progresso! Desenvolva seus argumentos com dados e referências concretas."
                      : "Excelente extensão! Lembre-se de elaborar uma proposta de intervenção completa na conclusão."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EscreverPage() {
  return (
    <Suspense>
      <EscreverPageInner />
    </Suspense>
  )
}
