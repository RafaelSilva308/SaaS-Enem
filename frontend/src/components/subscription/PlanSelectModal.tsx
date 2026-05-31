"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PremiumPlan {
  id: string
  label: string
  price: number
  period: string
  highlight: boolean
  features: string[]
}

// Espelha os planos premium do onboarding (StepPlan) e do GET /subscriptions/plans.
// Todos os planos têm AS MESMAS funcionalidades — a diferença é só o desconto por período.
export const PREMIUM_PLANS: PremiumPlan[] = [
  { id: "premium_1m", label: "1 mês", price: 59.90, period: "/mês", highlight: false,
    features: ["Plano de estudos completo", "Simulados ilimitados", "Score TRI estimado", "Correção de redação por IA"] },
  { id: "premium_3m", label: "3 meses", price: 99.90, period: "/trimestre", highlight: true,
    features: ["Tudo do plano mensal", "Ótimo custo-benefício"] },
  { id: "premium_6m", label: "6 meses", price: 149.90, period: "/semestre", highlight: false,
    features: ["Tudo dos planos anteriores", "Promoção especial", "Melhor custo-benefício"] },
]

interface Props {
  onSelect: (plan: PremiumPlan) => void
  onClose: () => void
}

export function PlanSelectModal({ onSelect, onClose }: Props) {
  const [selected, setSelected] = useState("premium_3m")
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
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Escolha seu plano</h2>
            <p className="text-sm text-muted-foreground">
              Cancele quando quiser · 7 dias grátis em todos os planos
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PREMIUM_PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                "relative text-left p-4 rounded-xl border transition-all",
                selected === plan.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20",
                plan.highlight && "ring-1 ring-secondary/40",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  Mais popular
                </span>
              )}
              <p className="font-bold text-sm">{plan.label}</p>
              <p className="text-lg font-bold text-gradient-brand">
                R$ {plan.price.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">{plan.period}</p>
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
        <p className="text-center text-xs text-muted-foreground mt-3">
          7 dias grátis, cancele antes sem custo. Pagamento seguro via Stripe.
        </p>
      </motion.div>
    </motion.div>
  )
}
