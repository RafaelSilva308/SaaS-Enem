"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, FileText, PenTool, Clock, CheckCircle2, Send, TrendingUp, ArrowRight, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Theme { id: string; title: string; description: string | null; year: number | null; source: string | null }
interface EssayItem {
  id: string; theme_title: string | null; word_count: number | null; line_count: number | null
  status: string; submitted_at: string | null; created_at: string; ai_score: number | null
  competency_scores?: number[]
}

type Tab = "temas" | "minhas"

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  draft:        { label: "Rascunho",    badgeClass: "badge-default" },
  submitted:    { label: "Enviada",     badgeClass: "badge-amber" },
  under_review: { label: "Analisando…", badgeClass: "badge-amber" },
  reviewed:     { label: "Corrigida",   badgeClass: "badge-success" },
}

const COMPETENCY_COLORS = ["#3b82f6", "#34d399", "#a78bfa", "#fbbf24", "#f87171"]

function scoreColor(score: number) {
  if (score >= 800) return "#2563eb"
  if (score >= 600) return "#10b981"
  if (score >= 400) return "#f59e0b"
  return "#ef4444"
}

export default function RedacaoPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("temas")
  const [themes, setThemes] = useState<Theme[]>([])
  const [essays, setEssays] = useState<EssayItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get("/essays/themes"), api.get("/essays")])
      .then(([tRes, eRes]) => { setThemes(tRes.data.themes); setEssays(eRes.data) })
      .catch(() => toast.error("Erro ao carregar dados"))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTheme = async (theme: Theme) => {
    try {
      const { data } = await api.post("/essays", { theme_id: theme.id, theme_title: theme.title })
      router.push(`/app/redacao/escrever?essayId=${data.essay_id}`)
    } catch { toast.error("Erro ao criar redação") }
  }

  const handleEssayClick = (essay: EssayItem) => {
    if (essay.status === "reviewed") router.push(`/app/redacao/${essay.id}`)
    else if (essay.status === "draft") router.push(`/app/redacao/escrever?essayId=${essay.id}`)
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  const reviewed = essays.filter(e => e.status === "reviewed")
  const pending = essays.filter(e => e.status === "under_review" || e.status === "submitted")
  const avgScore = reviewed.length ? Math.round(reviewed.reduce((a, e) => a + (e.ai_score ?? 0), 0) / reviewed.length) : 0
  const bestScore = reviewed.length ? Math.max(...reviewed.map(e => e.ai_score ?? 0)) : 0

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Page header */}
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Estudo → Redação</div>
            <h1 className="page-title">Redação</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary"><FileText size={14} /> Temas anteriores</button>
            <button className="btn btn-violet" onClick={() => setTab("temas")}>
              <PenTool size={14} /> Nova redação
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Entregues", value: String(essays.length), color: undefined },
            { label: "Nota média", value: avgScore > 0 ? String(avgScore) : "—", green: true, icon: TrendingUp },
            { label: "Melhor nota", value: bestScore > 0 ? String(bestScore) : "—", color: undefined },
            { label: "Aguardando", value: String(pending.length), amber: pending.length > 0 },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: 18, background: s.amber ? "rgba(245,158,11,0.05)" : undefined, border: s.amber ? "1px solid rgba(245,158,11,0.2)" : undefined }}>
              <div style={{ fontSize: 11.5, color: s.amber ? "#fcd34d" : "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              <div className="row" style={{ alignItems: "baseline", gap: 4, marginTop: 4 }}>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: s.amber ? "#fcd34d" : undefined }} className={s.green ? "text-gradient-green" : ""}>{s.value}</div>
                {s.amber && pending.length > 0 && (
                  <span style={{ width: 8, height: 8, background: "#f59e0b", borderRadius: 999, animation: "pulseGlow 1.5s infinite", display: "inline-block" }} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Featured new essay banner */}
        {themes[0] && (
          <div className="card card-premium" style={{ padding: 24, marginBottom: 20, position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => handleSelectTheme(themes[0])}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 100% 50%, rgba(124,58,237,0.15), transparent 60%)" }} />
            <div className="row" style={{ gap: 18, position: "relative" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)", flexShrink: 0 }}>
                <PenTool size={26} color="#fff" />
              </div>
              <div className="col" style={{ flex: 1, gap: 4 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge badge-premium">✦ Tema do dia</span>
                  <span className="badge badge-default mono">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>{themes[0].title}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Correção automática por IA em até 5 min</div>
              </div>
              <button className="btn btn-violet btn-lg" onClick={e => { e.stopPropagation(); handleSelectTheme(themes[0]) }}>
                Começar a escrever <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="tabs">
            <button className={`tab ${tab === "temas" ? "tab-active" : ""}`} onClick={() => setTab("temas")}>Temas</button>
            <button className={`tab ${tab === "minhas" ? "tab-active" : ""}`} onClick={() => setTab("minhas")}>
              Minhas Redações {essays.length > 0 && <span className="mono" style={{ marginLeft: 4, opacity: 0.6 }}>{essays.length}</span>}
            </button>
          </div>
        </div>

        {/* Temas grid */}
        {tab === "temas" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {themes.map((t) => (
              <button key={t.id} onClick={() => handleSelectTheme(t)} className="card card-hover" style={{ padding: 20, textAlign: "left", cursor: "pointer", fontFamily: "'Outfit', system-ui", color: "inherit", display: "block", width: "100%" }}>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <span className="badge badge-premium">✦ Tema ENEM</span>
                  {t.year && <span className="badge badge-default mono">{t.year}</span>}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>{t.title}</div>
                {t.description && <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.description}</div>}
                <div className="row" style={{ gap: 4, fontSize: 12, color: "var(--brand-blue-light)", fontWeight: 500 }}>
                  Escrever agora <ArrowRight size={11} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* My essays list */}
        {tab === "minhas" && (
          essays.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <PenTool size={40} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Nenhuma redação ainda. Escolha um tema para começar.</div>
            </div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {essays.map((e) => {
                const status = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.draft
                const canClick = e.status === "draft" || e.status === "reviewed"
                const colors = COMPETENCY_COLORS
                return (
                  <div key={e.id} className={`card ${canClick ? "card-hover" : ""}`} style={{ padding: 18, cursor: canClick ? "pointer" : "default" }} onClick={() => canClick && handleEssayClick(e)}>
                    <div className="row" style={{ gap: 18 }}>
                      <div className="col" style={{ width: 120, alignItems: "center", justifyContent: "center", padding: "12px 0", background: "rgba(15,23,42,0.4)", borderRadius: 12, border: "1px solid var(--border)", flexShrink: 0 }}>
                        {e.ai_score ? (
                          <>
                            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: scoreColor(e.ai_score) }}>{e.ai_score}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>/1000</div>
                          </>
                        ) : e.status === "under_review" || e.status === "submitted" ? (
                          <>
                            <Clock size={28} color="#fcd34d" />
                            <div style={{ fontSize: 11, color: "#fcd34d", marginTop: 6 }}>Aguardando</div>
                          </>
                        ) : (
                          <>
                            <PenTool size={24} style={{ color: "var(--muted-foreground)" }} />
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>Rascunho</div>
                          </>
                        )}
                      </div>
                      <div className="col" style={{ flex: 1, gap: 6 }}>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="mono" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            {new Date(e.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{e.theme_title ?? "Tema livre"}</div>
                        {e.competency_scores && e.competency_scores.length > 0 && (
                          <div className="row" style={{ gap: 14, marginTop: 8 }}>
                            {e.competency_scores.map((c, i) => (
                              <div key={i} className="col" style={{ alignItems: "flex-start", gap: 4 }}>
                                <div className="row" style={{ gap: 4, fontSize: 10.5, color: "var(--muted-foreground)" }}>
                                  <span className="subject-dot" style={{ background: colors[i], width: 6, height: 6 }} />
                                  C{i + 1}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{c}</div>
                                <div style={{ width: 36, height: 3, background: "rgba(30,41,59,0.6)", borderRadius: 999, overflow: "hidden" }}>
                                  <div style={{ width: `${(c / 200) * 100}%`, height: "100%", background: colors[i], borderRadius: 999 }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {canClick && <ChevronRight size={18} style={{ color: "var(--muted-foreground)", alignSelf: "center" }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
