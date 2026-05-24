"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, MailCheck, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

function VerifyEmailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer === 0) return
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(""))
      inputs.current[5]?.focus()
    }
  }

  async function handleVerify() {
    const code = otp.join("")
    if (code.length < 6) return toast.error("Digite os 6 dígitos")
    setLoading(true)
    try {
      await api.post("/auth/verify-email", { email, otp: code })
      toast.success("E-mail verificado! Faça login.")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Código inválido")
      setOtp(["", "", "", "", "", ""])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await api.post("/auth/resend-otp", { email })
      setResendTimer(60)
      toast.success("Novo código enviado!")
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.")
    }
  }

  return (
    <div className="auth-simple-wrap">
    <div className="glass rounded-2xl p-8 space-y-6 text-center">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-2">
          <MailCheck size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
        <p className="text-muted-foreground text-sm">
          Enviamos um código de 6 dígitos para{" "}
          <span className="text-foreground font-medium">{email || "seu e-mail"}</span>
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-10 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          />
        ))}
      </div>

      <Button
        onClick={handleVerify}
        disabled={loading || otp.join("").length < 6}
        className="w-full gradient-blue hover:opacity-90 font-semibold"
      >
        {loading && <Loader2 className="animate-spin mr-2" size={16} />}
        {loading ? "Verificando…" : "Confirmar código"}
      </Button>

      <div className="text-sm text-muted-foreground">
        {resendTimer > 0 ? (
          <span>Reenviar código em {resendTimer}s</span>
        ) : (
          <button
            onClick={handleResend}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <RefreshCw size={13} />
            Reenviar código
          </button>
        )}
      </div>
    </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailPageInner />
    </Suspense>
  )
}
