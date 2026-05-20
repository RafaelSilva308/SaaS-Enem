"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ProgressRing } from "@/components/study-plan/ProgressRing"

interface WeakTopic { topic: string; attempts: number; correct: number; accuracy: number }
interface SubjectData {
  subject: string; subject_label: string; accuracy_rate: number
  questions_answered: number; questions_correct: number
  weak_topics: WeakTopic[]; tri_history: number[]; recent_trend: string
}

const SUBJECTS = [
  { key: "linguagens", label: "Ling.",   color: "#2563eb" },
  { key: "matematica", label: "Mat.",    color: "#10b981" },
  { key: "cn",         label: "C. Nat.", color: "#7c3aed" },
  { key: "ch",         label: "C. Hum.", color: "#f59e0b" },
]

const TREND_ICON: Record<string, React.ReactNode> = {
  up:     <TrendingUp   size={14} className="text-secondary" />,
  down:   <TrendingDown size={14} className="text-destructive" />,
  stable: <Minus        size={14} className="text-muted-foreground" />,
}

const TREND_LABEL: Record<string, string> = {
  up: "Em alta", down: "Em queda", stable: "Estável",
}

export function SubjectDeepDive() {
  const [active, setActive]     = useState("linguagens")
  const [cache, setCache]       = useState<Record<string, SubjectData>>({})
  const [loading, setLoading]   = useState(false)

  const fetchSubject = useCallback(async (subj: string) => {
    if (cache[subj]) return
    setLoading(true)
    try {
      const { data } = await api.get(`/performance/subject/${subj}`)
      setCache((c) => ({ ...c, [subj]: data }))
    } finally {
      setLoading(false)
    }
  }, [cache])

  useEffect(() => { fetchSubject(active) }, [active, fetchSubject])

  const subj = SUBJECTS.find((s) => s.key === active)!
  const data = cache[active]

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-medium text-muted-foreground mb-4">Deep-dive por Área</p>

      {/* Tab switcher */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              active === s.key
                ? "text-white border-transparent"
                : "text-muted-foreground border-border hover:text-foreground",
            )}
            style={active === s.key ? { background: s.color } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-10">
          {loading
            ? <Loader2 className="animate-spin text-primary" size={24} />
            : <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="flex items-center gap-5">
            <ProgressRing
              percentage={data.accuracy_rate}
              size={80}
              strokeWidth={7}
              color={subj.color}
              label={`${data.accuracy_rate}%`}
              sublabel="acertos"
            />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="glass-sm rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Respondidas</p>
                <p className="text-lg font-bold tabular-nums">{data.questions_answered}</p>
              </div>
              <div className="glass-sm rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {TREND_ICON[data.recent_trend] ?? TREND_ICON.stable}
                  <p className="text-xs text-muted-foreground">{TREND_LABEL[data.recent_trend]}</p>
                </div>
                {data.tri_history.length > 0 ? (
                  <p className="text-lg font-bold tabular-nums" style={{ color: subj.color }}>
                    {data.tri_history[data.tri_history.length - 1]}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">—</p>
                )}
                <p className="text-[11px] text-muted-foreground">último TRI</p>
              </div>
            </div>
          </div>

          {/* Weak topics */}
          {data.weak_topics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Tópicos mais fracos
              </p>
              <div className="space-y-2">
                {data.weak_topics.map((t) => (
                  <div key={t.topic} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs truncate">{t.topic}</p>
                        <p className="text-xs font-medium shrink-0 ml-2" style={{ color: subj.color }}>
                          {t.accuracy}%
                        </p>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${t.accuracy}%`, background: subj.color, opacity: 0.7 }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0">
                      {t.correct}/{t.attempts}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.weak_topics.length === 0 && data.questions_answered === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Responda questões de {data.subject_label} para ver os tópicos mais fracos.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
