"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, CheckCircle, Loader2, ShieldAlert, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ContingencyStatus {
  severity: string
  days_behind: number
  hours_behind: number
  delay_percent: number
  health_score: number
  weakest_subject: string | null
}

interface Props {
  open: boolean
  status: ContingencyStatus
  onClose: () => void
  onConfirm: () => Promise<void>
}

const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens",
  matematica: "Matemática",
  cn: "Ciências da Natureza",
  ch: "Ciências Humanas",
}

const HEALTH_COLOR = (score: number) => {
  if (score >= 80) return "#10b981"
  if (score >= 50) return "#f59e0b"
  return "#ef4444"
}

export function ContingencyModal({ open, status, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setDone(true)
      setTimeout(onClose, 1800)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const color = HEALTH_COLOR(status.health_score)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md glass-strong rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {done ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <CheckCircle size={48} className="text-secondary" />
              <div>
                <p className="text-lg font-bold">Plano atualizado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus tópicos foram reorganizados por prioridade ENEM.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-400" />
                  <span className="font-semibold">Plano de Contingência</span>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Health score visual */}
                <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
                        className="text-muted/30" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={color}
                        strokeWidth="3" strokeDasharray={`${status.health_score} 100`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                      {status.health_score}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Saúde do plano: {status.health_score}/100</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {status.days_behind} {status.days_behind === 1 ? "dia" : "dias"} atrás ·{" "}
                      {status.hours_behind.toFixed(1)}h de atraso ({status.delay_percent.toFixed(0)}%)
                    </p>
                    {status.weakest_subject && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Área mais crítica: <span className="text-foreground font-medium">
                          {SUBJECT_LABELS[status.weakest_subject] ?? status.weakest_subject}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* O que vai mudar */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">O que será feito:</p>
                  {[
                    "Tópicos reordenados por frequência no ENEM e nível de dificuldade",
                    "Sprints futuros comprimidos com +25% de horas para recuperar o atraso",
                    "Disciplinas com mais fraqueza priorizadas no início do plano",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Zap size={13} className="text-primary shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Aviso */}
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-lg text-xs",
                  "bg-amber-500/8 border border-amber-500/20 text-amber-300/80",
                )}>
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  Tópicos já concluídos serão mantidos. Apenas os pendentes serão reorganizados.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-5 pb-5">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                  Manter como está
                </Button>
                <Button
                  className="flex-1 gradient-blue hover:opacity-90 font-semibold gap-2"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Reorganizando…</>
                    : <><Zap size={14} /> Corrigir Plano</>
                  }
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
