"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle, Calendar, CheckCircle, CreditCard,
  Loader2, RefreshCw, ShieldCheck, Sparkles, XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { CheckoutModal } from "@/components/subscription/CheckoutModal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────
interface Subscription {
  plan_type: string
  status: string
  start_date: string
  end_date: string
  auto_renewal: boolean
  amount_paid: number | null
  payment_method: string | null
  days_remaining: number
}

const PLAN_LABELS: Record<string, string> = {
  free: "Plano Grátis",
  premium_1m: "Premium Mensal",
  premium_3m: "Premium Trimestral",
  premium_6m: "Premium Semestral",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:   { label: "Ativo",             color: "text-secondary", icon: CheckCircle },
  trialing: { label: "Trial (7 dias)",    color: "text-primary",   icon: ShieldCheck },
  past_due: { label: "Pagamento pendente",color: "text-yellow-400",icon: AlertCircle },
  canceled: { label: "Cancelado",         color: "text-destructive",icon: XCircle },
  free:     { label: "Gratuito",          color: "text-muted-foreground", icon: CheckCircle },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto bancário",
  credit_card: "Cartão de crédito",
}

// ── Confirmation Dialog ────────────────────────────────────────────
function CancelConfirmDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="relative glass-strong rounded-2xl p-6 w-full max-w-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle size={20} className="text-destructive" />
          </div>
          <div>
            <p className="font-semibold">Cancelar assinatura?</p>
            <p className="text-xs text-muted-foreground">Seu acesso continua até o fim do período.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10" onClick={onClose}>
            Manter plano
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-destructive hover:bg-destructive/90 text-white">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  async function fetchSub() {
    setLoading(true)
    try {
      const { data } = await api.get("/subscriptions/me")
      setSub(data)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSub(null)
      } else {
        toast.error("Erro ao carregar assinatura")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSub() }, [])

  async function handleCancel() {
    setCanceling(true)
    try {
      await api.post("/subscriptions/cancel", {})
      toast.success("Renovação automática cancelada. Seu acesso continua até o fim do período.")
      setShowCancelDialog(false)
      fetchSub()
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao cancelar assinatura")
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  const statusInfo = sub ? (STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.free) : null
  const isFree = !sub || sub.plan_type === "free"
  const isPremium = sub && sub.plan_type !== "free"
  const isActive = sub && ["active", "trialing"].includes(sub.status)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura e cobrança</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seu plano e forma de pagamento</p>
      </div>

      {/* Plano atual */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plano atual</p>
            <p className="text-xl font-bold mt-0.5">
              {sub ? PLAN_LABELS[sub.plan_type] ?? sub.plan_type : "Sem plano ativo"}
            </p>
          </div>
          {statusInfo && (
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", statusInfo.color)}>
              <statusInfo.icon size={15} />
              {statusInfo.label}
            </div>
          )}
        </div>

        {sub && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div>
              <p className="text-xs text-muted-foreground">Início</p>
              <p className="text-sm font-medium">
                {new Date(sub.start_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {sub.auto_renewal ? "Próxima renovação" : "Acesso até"}
              </p>
              <p className="text-sm font-medium">
                {new Date(sub.end_date).toLocaleDateString("pt-BR")}
                <span className="text-muted-foreground text-xs ml-1.5">
                  ({sub.days_remaining} dias)
                </span>
              </p>
            </div>
            {sub.amount_paid && (
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="text-sm font-medium">
                  R$ {sub.amount_paid.toFixed(2).replace(".", ",")}
                </p>
              </div>
            )}
            {sub.payment_method && (
              <div>
                <p className="text-xs text-muted-foreground">Método</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <CreditCard size={13} />
                  {PAYMENT_METHOD_LABELS[sub.payment_method] ?? sub.payment_method}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Aviso de renovação desativada */}
        {sub && !sub.auto_renewal && isActive && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
            <AlertCircle size={15} className="text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-400">
              Renovação automática cancelada. Seu acesso termina em {sub.days_remaining} dias.
            </p>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-3">
        {isFree && (
          <div className="glass rounded-2xl p-5 space-y-3 border border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <p className="font-semibold">Faça upgrade para Premium</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Desbloqueie plano de estudos completo, simulados ilimitados, correção de redação por IA e muito mais.
            </p>
            <Button onClick={() => setShowUpgrade(true)} className="gradient-brand hover:opacity-90 font-semibold w-full">
              Ver planos Premium
            </Button>
          </div>
        )}

        {isPremium && isActive && sub.auto_renewal && (
          <Button
            variant="outline"
            className="w-full border-white/10 text-muted-foreground hover:text-destructive hover:border-destructive/40"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle size={15} className="mr-2" />
            Cancelar renovação automática
          </Button>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={fetchSub}>
          <RefreshCw size={14} className="mr-2" /> Atualizar status
        </Button>
      </div>

      {/* Informações de segurança */}
      <div className="flex items-start gap-3 p-4 glass rounded-xl">
        <ShieldCheck size={18} className="text-secondary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Pagamentos seguros via Stripe</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seus dados de pagamento são processados diretamente pelo Stripe com criptografia
            PCI DSS. O SaaS ENEM não armazena dados do seu cartão.
          </p>
        </div>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {showCancelDialog && (
          <CancelConfirmDialog
            onConfirm={handleCancel}
            onClose={() => setShowCancelDialog(false)}
          />
        )}
        {showUpgrade && (
          <CheckoutModal
            planId="premium_3m"
            planName="3 meses"
            planPrice={99.90}
            onSuccess={() => { setShowUpgrade(false); fetchSub() }}
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
