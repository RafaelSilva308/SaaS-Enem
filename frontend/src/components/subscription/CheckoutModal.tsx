"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle, Copy, CreditCard, FileText, Loader2,
  QrCode, X, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Types ──────────────────────────────────────────────────────────
interface CheckoutData {
  subscription_id: string
  payment_method: string
  pix_qr_code_url?: string
  pix_copy_paste?: string
  pix_expires_at?: string
  boleto_url?: string
  boleto_barcode?: string
  boleto_due_date?: string
  setup_client_secret?: string
  card_success?: boolean
  is_free?: boolean
}

interface Props {
  planId: string
  planName: string
  planPrice: number
  onSuccess: () => void
  onClose: () => void
}

const PAYMENT_METHODS = [
  { id: "pix",         icon: QrCode,     label: "PIX",           desc: "Aprovação imediata" },
  { id: "boleto",      icon: FileText,   label: "Boleto",        desc: "Vence em 3 dias" },
  { id: "credit_card", icon: CreditCard, label: "Cartão",        desc: "Débito imediato" },
]

// ── Sub-components ──────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copiado!`)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
      {copied ? "Copiado!" : `Copiar ${label}`}
    </button>
  )
}

function PixView({ data, onSuccess }: { data: CheckoutData; onSuccess: () => void }) {
  const [checking, setChecking] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll a cada 5s até o pagamento ser confirmado
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const { data: sub } = await api.get("/subscriptions/me")
        if (sub.status === "active" || sub.status === "trialing") {
          clearInterval(intervalRef.current!)
          setConfirmed(true)
          setTimeout(onSuccess, 1500)
        }
      } catch { /* continua tentando */ }
    }, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [onSuccess])

  if (confirmed) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-center py-8 space-y-3">
        <CheckCircle size={52} className="text-secondary mx-auto" />
        <p className="text-xl font-bold text-secondary">Pagamento confirmado!</p>
        <p className="text-muted-foreground text-sm">Redirecionando para o dashboard…</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Escaneie o QR code ou copie o código PIX
        </p>
        {/* QR code — em dev mostra ícone placeholder */}
        <div className="inline-flex items-center justify-center w-44 h-44 glass rounded-2xl mx-auto">
          {data.pix_qr_code_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.pix_qr_code_url} alt="QR Code PIX" className="w-40 h-40" />
          ) : (
            <QrCode size={80} className="text-primary opacity-40" />
          )}
        </div>
      </div>

      {data.pix_copy_paste && (
        <div className="glass rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Copia e cola:</p>
          <p className="text-xs font-mono break-all leading-relaxed text-foreground/80 line-clamp-3">
            {data.pix_copy_paste}
          </p>
          <CopyButton text={data.pix_copy_paste} label="código PIX" />
        </div>
      )}

      <div className="flex items-center gap-2 justify-center">
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Aguardando pagamento…</p>
      </div>

      {data.pix_expires_at && (
        <p className="text-center text-xs text-muted-foreground">
          Expira em: {new Date(data.pix_expires_at).toLocaleTimeString("pt-BR")}
        </p>
      )}
    </div>
  )
}

function BoletoView({ data, onSuccess }: { data: CheckoutData; onSuccess: () => void }) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-5 text-center space-y-3">
        <FileText size={40} className="text-primary mx-auto" />
        <p className="font-semibold">Boleto gerado com sucesso</p>
        <p className="text-sm text-muted-foreground">
          Vencimento: <span className="font-medium text-foreground">{data.boleto_due_date ?? "em 3 dias"}</span>
        </p>
      </div>

      {data.boleto_barcode && (
        <div className="glass rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Código de barras:</p>
          <p className="text-xs font-mono break-all">{data.boleto_barcode}</p>
          <CopyButton text={data.boleto_barcode} label="código de barras" />
        </div>
      )}

      <div className="space-y-2">
        {data.boleto_url && (
          <a href={data.boleto_url} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gradient-blue hover:opacity-90 font-semibold">
              <FileText size={16} className="mr-2" /> Abrir / Baixar boleto
            </Button>
          </a>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Após o pagamento, seu acesso é liberado em até 1 dia útil.
        </p>
        <Button variant="outline" className="w-full border-white/10 text-sm" onClick={onSuccess}>
          Já paguei — ir para o dashboard
        </Button>
      </div>
    </div>
  )
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#f8fafc",
      fontFamily: '"Outfit", system-ui, sans-serif',
      fontSize: "14px",
      "::placeholder": { color: "#475569" },
    },
    invalid: { color: "#f87171" },
  },
}

function CardSetupView({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    setLoading(true)
    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })
    setLoading(false)

    if (error) {
      toast.error(error.message ?? "Erro ao confirmar cartão. Tente novamente.")
      return
    }

    toast.success("Cartão vinculado! Bem-vindo ao ENEM Pro Premium.")
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Dados do cartão</p>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>
      <Button type="submit" disabled={loading || !stripe}
        className="w-full gradient-blue hover:opacity-90 font-semibold">
        {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CreditCard size={16} className="mr-2" />}
        {loading ? "Processando…" : "Confirmar cartão"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Dados tokenizados via Stripe. Nenhuma informação de cartão passa pelo nosso servidor.
      </p>
    </form>
  )
}

// ── Main Modal ──────────────────────────────────────────────────────

export function CheckoutModal({ planId, planName, planPrice, onSuccess, onClose }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<string>("pix")
  const [loading, setLoading] = useState(false)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)

  async function handleProceed() {
    setLoading(true)
    try {
      const { data } = await api.post("/subscriptions/create", {
        plan_type: planId,
        payment_method: selectedMethod,
      })

      if (data.is_free) {
        onSuccess()
        return
      }

      if (data.card_success) {
        toast.success("Pagamento confirmado! Seja bem-vindo ao Premium.")
        onSuccess()
        return
      }

      setCheckoutData(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao iniciar checkout. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative glass-strong rounded-2xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Checkout — {planName}</h2>
            <p className="text-sm text-muted-foreground">
              R$ {planPrice.toFixed(2).replace(".", ",")} · 7 dias grátis
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!checkoutData ? (
            <motion.div key="method-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-5">
              {/* Método de pagamento */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Método de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(({ id, icon: Icon, label, desc }) => (
                    <button key={id} onClick={() => setSelectedMethod(id)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all",
                        selectedMethod === id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}>
                      <Icon size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleProceed} disabled={loading}
                className="w-full gradient-brand hover:opacity-90 font-semibold">
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Zap size={16} className="mr-2" />}
                {loading
                  ? "Aguarde…"
                  : selectedMethod === "pix"
                    ? "Gerar QR Code PIX"
                    : selectedMethod === "boleto"
                      ? "Gerar Boleto"
                      : "Continuar para dados do cartão"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Trial de 7 dias gratuito. Cancele antes sem cobrança.
              </p>
            </motion.div>
          ) : checkoutData.payment_method === "pix" ? (
            <motion.div key="pix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <PixView data={checkoutData} onSuccess={onSuccess} />
            </motion.div>
          ) : checkoutData.payment_method === "credit_card" ? (
            <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              {checkoutData.setup_client_secret ? (
                <Elements stripe={stripePromise}>
                  <CardSetupView clientSecret={checkoutData.setup_client_secret} onSuccess={onSuccess} />
                </Elements>
              ) : (
                <p className="text-center text-sm text-destructive py-6">
                  Não foi possível iniciar o setup do cartão. Tente novamente ou use PIX.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div key="boleto" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <BoletoView data={checkoutData} onSuccess={onSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
