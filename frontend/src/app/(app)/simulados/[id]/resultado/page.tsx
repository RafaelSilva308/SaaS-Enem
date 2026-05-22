"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ChevronLeft, TrendingUp, RefreshCw, Share2, FileText, Check, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Option { letter: string; text: string }
interface AnswerDetail {
  question_id: string; subject: string; subject_label: string; topic: string | null
  difficulty: string | null; user_answer: string | null; correct_answer: string
  is_correct: boolean | null; statement_preview: string; options: Option[]
}
interface SubjectPerf {
  subject: string; subject_label: string; total: number
  correct: number; wrong: number; unanswered: number; percentage: number; tri_score: number | null
}
interface ResultData {
  exam_type: string; subject: string | null; total_questions: number
  correct_answers: number; wrong_answers: number; unanswered: number
  raw_score: number; score_estimate: number | null; completed_at: string
  duration_actual_minutes: number; performance_by_subject: SubjectPerf[]; answers: AnswerDetail[]
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const step = Math.max(10, Math.ceil(duration / (target || 1)))
    const id = setInterval(() => { setVal(v => { if (v + 2 >= target) { clearInterval(id); return target } return v + 2 }) }, step)
    return () => clearInterval(id)
  }, [target, duration])
  return val
}

const SUBJECT_COLORS: Record<string, string> = {
  matematica: "#2563eb", linguagens: "#f59e0b", cn: "#10b981", ch: "#ef4444",
}
const SUBJECT_BADGE: Record<string, string> = {
  matematica: "s-mat", linguagens: "s-lin", cn: "s-nat", ch: "s-hum",
}

function Radar({ data, size = 280 }: { data: { label: string; value: number; avg: number }[]; size?: number }) {
  const n = data.length, cx = size / 2, cy = size / 2, r = size / 2 - 36
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const polar = (val: number, i: number): [number, number] => {
    const a = angle(i), dist = (val / 100) * r
    return [cx + Math.cos(a) * dist, cy + Math.sin(a) * dist]
  }
  const pts = data.map((d, i) => polar(d.value, i))
  const avgPts = data.map((d, i) => polar(d.avg ?? 55, i))
  const toPath = (p: [number, number][]) => p.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${pt[1]}`).join(" ") + " Z"
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="radar-fill"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0.25" /></radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <polygon key={i} points={Array.from({ length: n }).map((_, idx) => { const a = angle(idx); return `${cx + Math.cos(a) * r * p},${cy + Math.sin(a) * r * p}` }).join(" ")} fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
      ))}
      {Array.from({ length: n }).map((_, i) => { const a = angle(i); return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="rgba(148,163,184,0.1)" strokeWidth="1" /> })}
      <path d={toPath(avgPts as [number, number][])} fill="rgba(148,163,184,0.06)" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={toPath(pts as [number, number][])} fill="url(#radar-fill)" stroke="#3b82f6" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#3b82f6" stroke="#020617" strokeWidth="2" />)}
      {data.map((d, i) => { const a = angle(i), lx = cx + Math.cos(a) * (r + 18), ly = cy + Math.sin(a) * (r + 18); return <text key={i} x={lx} y={ly} fill="rgba(248,250,252,0.85)" fontSize="11.5" textAnchor="middle" fontWeight="500" dominantBaseline="middle">{d.label}</text> })}
    </svg>
  )
}

export default function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    api.get(`/exams/scheduled/${id}/result`)
      .then(({ data: res }) => setData(res))
      .catch(() => toast.error("Erro ao carregar resultado"))
      .finally(() => setLoading(false))
  }, [id])

  const scoreAnim = useCountUp(data?.raw_score ?? 0)

  const handleShare = async () => {
    const text = `Acertei ${data?.raw_score}% no simulado ENEM Pro! 🎯`
    if (navigator.share) {
      await navigator.share({ title: "Meu resultado — ENEM Pro", text, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`).then(() => toast.success("Link copiado!")).catch(() => {})
    }
  }

  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--primary)" }} size={32} />
      </div>
    )
  }

  const gradeLabel = data.raw_score >= 80 ? "A" : data.raw_score >= 60 ? "B" : data.raw_score >= 40 ? "C" : "D"
  const gradeDesc = data.raw_score >= 80 ? "Excelente" : data.raw_score >= 60 ? "Bom" : data.raw_score >= 40 ? "Regular" : "Precisa melhorar"
  const triScore = data.score_estimate
  const dt = new Date(data.completed_at)

  const radarData = data.performance_by_subject.map(p => ({
    label: p.subject_label.split(" ")[0],
    value: p.percentage,
    avg: 58,
  }))

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        {/* Breadcrumb */}
        <div className="row" style={{ gap: 10, marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/simulados")}>
            <ChevronLeft size={13} /> Voltar
          </button>
          <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>Simulados → Resultado</span>
        </div>

        {/* Hero */}
        <div className="card" style={{ padding: 32, marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 80% at 20% 0%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(40% 80% at 80% 100%, rgba(124,58,237,0.16), transparent 60%)" }} />
          <div className="row between" style={{ position: "relative", gap: 40 }}>
            <div className="col" style={{ gap: 8 }}>
              <span className="badge badge-success" style={{ alignSelf: "flex-start" }}>
                Concluído · {dt.toLocaleDateString("pt-BR")} · {data.duration_actual_minutes} min
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Resultado do Simulado</h1>
              <div className="row" style={{ alignItems: "baseline", gap: 12, marginTop: 8 }}>
                <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }} className="text-gradient-brand">
                  {scoreAnim}
                </div>
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontSize: 18, color: "var(--muted-foreground)", fontWeight: 500 }}>%</div>
                    {triScore && <div className="row" style={{ gap: 4, color: "#6ee7b7", fontWeight: 600, fontSize: 14 }}><TrendingUp size={13} /> TRI: {triScore}</div>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                    {data.correct_answers}/{data.total_questions} corretas · {data.wrong_answers} erradas
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleShare}><Share2 size={12} /> Compartilhar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push("/app/simulados")}><RefreshCw size={12} /> Novo simulado</button>
                <button className="btn btn-primary btn-sm"><FileText size={12} /> Relatório PDF</button>
              </div>
            </div>
            <div className="col" style={{ alignItems: "center", gap: 8 }}>
              <div style={{ width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))", border: "2px solid rgba(16,185,129,0.4)", display: "grid", placeItems: "center", boxShadow: "0 0 28px rgba(16,185,129,0.3)" }}>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em" }} className="text-gradient-green">{gradeLabel}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>{gradeDesc}</div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Radar */}
          {radarData.length >= 3 && (
            <div className="card" style={{ padding: 24 }}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Desempenho por área</h3>
                <div className="row" style={{ gap: 12, fontSize: 11.5 }}>
                  <div className="row" style={{ gap: 6, color: "var(--muted-foreground)" }}><span style={{ width: 10, height: 3, background: "#3b82f6", borderRadius: 2 }} /> Você</div>
                  <div className="row" style={{ gap: 6, color: "var(--muted-foreground)" }}><span style={{ width: 10, height: 3, background: "#94a3b8", borderRadius: 2, opacity: 0.5 }} /> Média</div>
                </div>
              </div>
              <div className="row center" style={{ paddingTop: 12 }}>
                <Radar data={radarData} size={280} />
              </div>
            </div>
          )}

          {/* Por área */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Acertos por área</h3>
              <span className="badge badge-default mono">{data.correct_answers} / {data.total_questions}</span>
            </div>
            <div className="col" style={{ gap: 14 }}>
              {data.performance_by_subject.map((p, i) => {
                const color = SUBJECT_COLORS[p.subject] ?? "#94a3b8"
                const badge = SUBJECT_BADGE[p.subject] ?? "badge-default"
                return (
                  <div key={i}>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="subject-dot" style={{ background: color }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.subject_label}</span>
                      </div>
                      <div className="row" style={{ gap: 12, fontSize: 12 }}>
                        <span className="mono" style={{ color: "var(--muted-foreground)" }}>{p.correct}/{p.total}</span>
                        <span style={{ fontWeight: 600, width: 36, textAlign: "right" }}>{p.percentage}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "rgba(30,41,59,0.6)", borderRadius: 999 }}>
                      <div style={{ width: `${p.percentage}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Answers review */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row between" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Revisão de questões</h3>
            <span className="badge badge-default">{data.answers.length} questões</span>
          </div>
          {data.answers.map((a, i) => (
            <div key={a.question_id} style={{ borderBottom: i < data.answers.length - 1 ? "1px solid var(--border)" : "none" }}>
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                style={{ width: "100%", padding: "12px 24px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Outfit', system-ui", color: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
              >
                {a.is_correct === true && <Check size={16} style={{ color: "#10b981", flexShrink: 0 }} />}
                {a.is_correct === false && <X size={16} style={{ color: "#ef4444", flexShrink: 0 }} />}
                {a.is_correct === null && <span style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.3 }}>—</span>}
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", width: 24, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.statement_preview}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", flexShrink: 0 }}>{a.subject_label}</span>
              </button>
              {expandedIndex === i && (
                <div style={{ padding: "0 24px 16px", background: "rgba(15,23,42,0.3)" }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#e2e8f0", marginBottom: 14 }}>{a.statement_preview}</p>
                  <div className="col" style={{ gap: 6 }}>
                    {a.options.map(opt => {
                      const isCorrect = opt.letter === a.correct_answer
                      const isWrong = opt.letter === a.user_answer && !isCorrect
                      return (
                        <div key={opt.letter} className="row" style={{ gap: 10, padding: "10px 14px", borderRadius: 10, background: isCorrect ? "rgba(16,185,129,0.1)" : isWrong ? "rgba(239,68,68,0.08)" : "rgba(30,41,59,0.4)", border: `1px solid ${isCorrect ? "rgba(16,185,129,0.4)" : isWrong ? "rgba(239,68,68,0.3)" : "var(--border)"}` }}>
                          <span style={{ width: 28, height: 28, borderRadius: 8, background: isCorrect ? "rgba(16,185,129,0.2)" : "rgba(30,41,59,0.8)", border: `1px solid ${isCorrect ? "#10b981" : "var(--border-strong)"}`, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13, flexShrink: 0, color: isCorrect ? "#6ee7b7" : isWrong ? "#fca5a5" : "inherit" }}>
                            {opt.letter}
                          </span>
                          <span style={{ flex: 1, fontSize: 13.5, color: isCorrect ? "#6ee7b7" : isWrong ? "#fca5a5" : "#cbd5e1" }}>{opt.text}</span>
                          {isCorrect && <Check size={14} color="#6ee7b7" />}
                          {isWrong && <X size={14} color="#fca5a5" />}
                        </div>
                      )
                    })}
                  </div>
                  {!a.is_correct && a.user_answer && (
                    <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 10 }}>
                      Sua resposta: <strong style={{ color: "#fca5a5" }}>{a.user_answer}</strong> · Correta: <strong style={{ color: "#6ee7b7" }}>{a.correct_answer}</strong>
                    </p>
                  )}
                  {!a.user_answer && (
                    <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 10 }}>Não respondida · Correta: <strong style={{ color: "#6ee7b7" }}>{a.correct_answer}</strong></p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
