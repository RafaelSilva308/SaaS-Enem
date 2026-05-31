"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Clock, Sparkles, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PremiumPlan {
  id: string
  label: string
  price: number
  period: string
  perMonth: number
  discount: number | null
  highlight: boolean
  badge: string | null
  features: string[]
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: "premium_1m",
    label: "1 mês",
    price: 29.90,
    period: "/mês",
    perMonth: 29.90,
    discount: null,
    highlight: false,
    badge: null,
    features: [
      "Plano de estudos completo",
      "Simulados ilimitados",
      "Score TRI estimado",
      "Correção de redação por IA",
    ],
  },
  {
    id: "premium_3m",
    label: "3 meses",
    price: 79.90,
    period: "/trimestre",
    perMonth: 26.63,
    discount: 11,
    highlight: false,
    badge: null,
    features: ["Tudo do plano mensal", "Economia de R$ 9,80 vs. mensal"],
  },
  {
    id: "premium_6m",
    label: "6 meses",
    price: 149.90,
    period: "/semestre",
    perMonth: 24.98,
    discount: 17,
    highlight: true,
    badge: "Cobre o ENEM inteiro",
    features: ["Tudo dos planos anteriores", "Melhor custo-benefício", "Economia de R$ 29,50 vs. mensal"],
  },
]

interface Props {
  onSelect: (plan: PremiumPlan) => void
  onClose: () => void
}

export function PlanSelectModal({ onSelect, onClose }: Props) {
  const [selected, setSelected] = useState("premium_6m")
  const selectedPlan = PREMIUM_PLANS.find(p => p.id === selected)!

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold">Escolha seu plano</h2>
            <p className="text-sm text-muted-foreground">
              7 dias grátis em todos · cancele quando quiser
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Urgency banner */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <Clock size={13} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 font-medium">
            Preço de lançamento · válido por tempo limitado
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PREMIUM_PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                "relative text-left p-4 rounded-xl border transition-all",
                selected === plan.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-white/5 hover:border-white/20",
                plan.highlight && selected !== plan.id && "ring-1 ring-secondary/50",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <p className="font-bold text-sm mb-0.5">{plan.label}</p>

              {/* Discount badge */}
              {plan.discount && (
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 mb-1">
                  −{plan.discount}%
                </span>
              )}

              <p className="text-lg font-bold text-gradient-brand leading-none">
                R$ {plan.price.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[10px] text-muted-foreground">{plan.period}</p>

              {/* Per-month highlight */}
              <p className="text-[11px] font-semibold text-primary/80 mt-1 mb-2">
                R$ {plan.perMonth.toFixed(2).replace(".", ",")}/mês
              </p>

              <ul className="space-y-0.5">
                {plan.features.map(f => (
                  <li key={f} className="text-[10px] text-muted-foreground flex items-start gap-1">
                    <CheckCircle size={9} className="text-secondary shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <Button
          onClick={() => onSelect(selectedPlan)}
          className="w-full gradient-brand hover:opacity-90 font-semibold mt-5"
        >
          <Sparkles size={16} className="mr-2" />
          Iniciar trial de 7 dias — {selectedPlan.label}
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Zap size={11} className="text-muted-foreground" />
          <p className="text-center text-xs text-muted-foreground">
            7 dias grátis, cancele antes sem cobrança. Pagamento seguro via Stripe.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
