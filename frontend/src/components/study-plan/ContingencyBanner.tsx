"use client"

import { useState } from "react"
import { AlertTriangle, X, Zap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ContingencyStatus {
  delay_detected: boolean
  severity: string
  days_behind: number
  hours_behind: number
  health_score: number
}

interface Props {
  status: ContingencyStatus
  onFix: () => void
}

const SEVERITY_CONFIG = {
  leve:     { bg: "bg-amber-500/10 border-amber-500/30",  text: "text-amber-400",  icon: "text-amber-400",  label: "Leve atraso" },
  moderado: { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", icon: "text-orange-400", label: "Atraso moderado" },
  severo:   { bg: "bg-red-500/10 border-red-500/30",      text: "text-red-400",    icon: "text-red-400",    label: "Atraso grave" },
}

export function ContingencyBanner({ status, onFix }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (!status.delay_detected || dismissed) return null

  const cfg = SEVERITY_CONFIG[status.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.leve

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          cfg.bg,
        )}
      >
        <AlertTriangle size={16} className={cn("shrink-0", cfg.icon)} />

        <div className="flex-1 min-w-0">
          <span className={cn("font-semibold", cfg.text)}>{cfg.label} detectado. </span>
          <span className="text-muted-foreground">
            Você está {status.days_behind} {status.days_behind === 1 ? "dia" : "dias"} ({status.hours_behind.toFixed(1)}h)
            atrás do cronograma.
          </span>
        </div>

        <button
          onClick={onFix}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-opacity hover:opacity-80",
            "bg-primary text-white",
          )}
        >
          <Zap size={12} />
          Corrigir Meu Plano
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dispensar"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
