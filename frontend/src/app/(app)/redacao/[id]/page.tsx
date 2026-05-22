"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, ChevronLeft, TrendingUp, Check } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface GrammarError { line: number; excerpt: string; correction: string; type: string }
interface Analysis {
  ai_score: number
  competency1_score: number; competency2_score: number; competency3_score: number
  competency4_score: number; competency5_score: number
  structural_feedback: string | null; argument_feedback: string | null; language_feedback: string | null
  grammar_errors: GrammarError[]; suggestions: string[]
}
interface EssayData {
  id: string; theme_title: string | null; text: string; word_count: number | null
  line_count: number | null; status: string; submitted_at: string | null; analysis: Analysis | null
}

const COMPETENCIES = [
  { key: "competency1_score" as const, label: "Domínio da norma culta", color: "#3b82f6", n: 1 },
  { key: "competency2_score" as const, label: "Compreensão do tema", color: "#34d399", n: 2 },
  { key: "competency3_score" as const, label: "Argumentação e seleção de informações", color: "#a78bfa", n: 3 },
  { key: "competency4_score" as const, label: "Mecanismos linguísticos coesos", color: "#fbbf24", n: 4 },
  { key: "competency5_score" as const, label: "Proposta de intervenção", color: "#f87171", n: 5 },
]
const FEEDBACK_MAP = [
  { label: "Estrutura e norma culta (C1, C3)", key: "structural_feedback" as const, color: "#3b82f6" },
  { label: "Argumentação e intervenção (C2, C5)", key: "argument_feedback" as const, color: "#34d399" },
  { label: "Mecanismos linguísticos (C4)", key: "language_feedback" as const, color: "#fbbf24" },
]

function useCountUp(target: number, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let current = 0
      const step = Math.max(1, Math.floor(target / 60))
      const iv = setInterval(() => {
        current = Math.min(target, current + step)
        setVal(current)
        if (current >= target) clearInterval(iv)
      }, 25)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay])
  return val
}

function scoreLabel(score: number) {
  if (score >= 800) return "Excelente desempenho"
  if (score >= 600) return "Bom desempenho"
  if (score >= 400) return "Desempenho regular"
  return "Precisa melhorar"
}

export default function EssayResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<EssayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showText, setShowText] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEssay = async () => {
    const { data: res } = await api.get(`/essays/${id}`)
    setData(res)
    if (res.status === "reviewed" && pollRef.current) clearInterval(pollRef.current)
    return res
  }

  useEffect(() => {
    fetchEssay()
      .catch(() => { toast.error("Redação não encontrada"); router.push("/app/redacao") })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!data || data.status !== "under_review") return
    pollRef.current = setInterval(async () => {
      try { await fetchEssay() } catch { /* ignore */ }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.status])

  const score = useCountUp(data?.analysis?.ai_score ?? 0, 300)

  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  if (data.status !== "reviewed" || !data.analysis) {
    return (
      <div className="page-scroll">
        <div className="page-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/redacao")} style={{ alignSelf: "flex-start" }}>
            <ChevronLeft size={13} /> Voltar
          </button>
          <div className="card" style={{ padding: 48, maxWidth: 480, width: "100%" }}>
            <RefreshCw size={36} className="animate-spin" style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Analisando sua redação…</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>A IA está avaliando as 5 competências. Esta página atualiza automaticamente.</div>
          </div>
        </div>
      </div>
    )
  }

  const { analysis } = data
  const dt = data.submitted_at ? new Date(data.submitted_at) : null

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Breadcrumb */}
        <div className="row" style={{ gap: 10, marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/redacao")}>
            <ChevronLeft size={13} /> Voltar
          </button>
          <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>Redação → Ver correção</span>
        </div>

        {/* Header */}
        <div className="card" style={{ padding: 28, marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 80% at 100% 0%, rgba(124,58,237,0.16), transparent 60%)" }} />
          <div className="row between" style={{ position: "relative", gap: 32 }}>
            <div className="col" style={{ gap: 8 }}>
              <span className="badge badge-success" style={{ alignSelf: "flex-start" }}>
                Corrigida{dt ? ` · ${dt.toLocaleDateString("pt-BR")} · ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
              <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, maxWidth: 600 }}>{data.theme_title ?? "Redação"}</h1>
              <div className="row" style={{ alignItems: "baseline", gap: 12, marginTop: 8 }}>
                <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }} className="text-gradient-brand">{score}</div>
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 16, color: "var(--muted-foreground)" }}>/ 1000</div>
                  <div className="row" style={{ gap: 4, color: "#6ee7b7", fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                    <TrendingUp size={12} /> {scoreLabel(analysis.ai_score)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col" style={{ alignItems: "flex-end", gap: 6 }}>
              <span className="badge badge-premium">✦ Correção IA</span>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{data.word_count} palavras · {data.line_count} linhas</div>
            </div>
          </div>
        </div>

        {/* Two columns: text + competencies */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          {/* Annotated text */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Texto anotado</h3>
              <div className="row" style={{ gap: 6 }}>
                {COMPETENCIES.map((c) => (
                  <span key={c.n} className="row" style={{ gap: 4, fontSize: 10.5, color: "var(--muted-foreground)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />C{c.n}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.85, color: "#e2e8f0", fontFamily: "'Outfit', Georgia, serif" }}>
              {data.text.split("\n").map((para, i) => (
                <p key={i} style={{ marginBottom: 14 }}>{para}</p>
              ))}
            </div>

            {/* Grammar errors */}
            {analysis.grammar_errors.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--muted-foreground)" }}>
                  Erros identificados ({analysis.grammar_errors.length})
                </div>
                <div className="col" style={{ gap: 8 }}>
                  {analysis.grammar_errors.map((e, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10.5, background: "rgba(239,68,68,0.2)", color: "#fca5a5", padding: "2px 6px", borderRadius: 4 }}>{e.type}</span>
                        {e.line > 0 && <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>linha {e.line}</span>}
                      </div>
                      <p style={{ fontSize: 13, color: "#fca5a5", textDecoration: "line-through", marginBottom: 4 }}>{e.excerpt}</p>
                      <p style={{ fontSize: 13, color: "#6ee7b7" }}>→ {e.correction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--muted-foreground)" }}>Sugestões para próxima redação</div>
                <div className="col" style={{ gap: 8 }}>
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="row" style={{ gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedbacks */}
            {(analysis.structural_feedback || analysis.argument_feedback || analysis.language_feedback) && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--muted-foreground)" }}>Análise detalhada</div>
                <div className="col" style={{ gap: 12 }}>
                  {FEEDBACK_MAP.filter(f => analysis[f.key]).map((f) => (
                    <div key={f.key}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: f.color, marginBottom: 4 }}>{f.label}</div>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{analysis[f.key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Competencies */}
          <div className="col" style={{ gap: 12 }}>
            {COMPETENCIES.map((c) => {
              const cScore = analysis[c.key]
              return (
                <div key={c.n} className="card" style={{ padding: 16 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: `${c.color}25`, color: c.color, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>C{c.n}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                    </div>
                    <div className="row" style={{ alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", color: c.color }}>{cScore}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/200</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "rgba(30,41,59,0.6)", borderRadius: 999, marginBottom: 10 }}>
                    <div style={{ width: `${(cScore / 200) * 100}%`, height: "100%", background: c.color, borderRadius: 999, boxShadow: `0 0 8px ${c.color}40` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Original text toggle */}
        <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
          <button className="row" style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Outfit', system-ui", color: "inherit", gap: 8 }} onClick={() => setShowText(v => !v)}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: "left" }}>Ver texto original</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{showText ? "▲" : "▼"}</span>
          </button>
          {showText && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", marginTop: 16, fontFamily: "'Outfit', Georgia, serif" }}>{data.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
