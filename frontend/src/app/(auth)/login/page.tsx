"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, ArrowRight, Mail, Lock, Check, TrendingUp, Brain } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  totp_code: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  cx: `${(i * 113) % 100}%`,
  cy: `${(i * 197) % 100}%`,
  r: 0.6 + (i % 5) * 0.3,
  opacity: 0.2 + ((i * 17) % 60) / 100,
}))

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/app/dashboard"
  const { setAuth } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(true)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setLoading(true)
    try {
      const { data } = await api.post("/auth/login", values)
      setAuth(data.user, data.tokens.access_token, data.tokens.refresh_token)
      toast.success(`Bem-vindo, ${data.user.name}!`)
      router.push(redirect)
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? "Erro ao fazer login"
      if (detail.includes("2FA") || err.response?.status === 422) {
        setNeeds2FA(true)
        toast.info("Digite o código do seu aplicativo autenticador")
      } else {
        toast.error(detail)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* Left visual panel */}
      <div className="auth-left" style={{ background: "linear-gradient(135deg, #0a1226 0%, #1a0b2e 100%)" }}>
        <div className="aurora-blob" style={{ width: 480, height: 480, background: "#2563eb", top: "-100px", left: "-100px" }} />
        <div className="aurora-blob" style={{ width: 380, height: 380, background: "#7c3aed", bottom: "-80px", right: "-80px", animationDelay: "3s" }} />
        <div className="aurora-blob" style={{ width: 280, height: 280, background: "#10b981", top: "45%", left: "30%", opacity: 0.25, animationDelay: "6s" }} />

        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {PARTICLES.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="white" opacity={p.opacity} />
          ))}
        </svg>

        <div style={{ position: "absolute", inset: 0, padding: "56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 2 }}>
          <div className="row" style={{ gap: 10 }}>
            <div className="sidebar-logo-icon" style={{ height: 36, width: 36, fontSize: 15 }}>EP</div>
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>ENEM Pro</div>
          </div>

          {/* Floating preview cards */}
          <div style={{ position: "relative", flex: 1, marginTop: 60 }}>
            <div className="glass" style={{ position: "absolute", top: 40, left: 0, padding: 20, borderRadius: 18, width: 280, transform: "rotate(-3deg)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <span className="badge badge-success">Aprovação</span>
                <TrendingUp size={14} style={{ color: "#34d399" }} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.04em" }}>
                872<span style={{ fontSize: 18, color: "var(--muted-foreground)", marginLeft: 4 }}>/1000</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Pontuação simulada</div>
              <div className="progress" style={{ marginTop: 12 }}>
                <div className="progress-fill progress-fill-green" style={{ width: "87%" }} />
              </div>
            </div>

            <div className="glass" style={{ position: "absolute", top: 200, right: 20, padding: 18, borderRadius: 18, width: 260, transform: "rotate(4deg)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }}>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(124, 58, 237, 0.18)", display: "grid", placeItems: "center", color: "#a78bfa" }}>
                  <Brain size={16} />
                </div>
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Correção IA</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Redação · 940 pts</div>
                </div>
              </div>
              <div className="col" style={{ gap: 5 }}>
                {[200, 180, 200, 180, 180].map((n, i) => (
                  <div key={i} className="row" style={{ gap: 6, fontSize: 11 }}>
                    <span style={{ width: 22, color: "var(--muted-foreground)" }}>C{i + 1}</span>
                    <div style={{ flex: 1, height: 4, background: "rgba(30,41,59,0.7)", borderRadius: 999 }}>
                      <div style={{ width: `${n / 2}%`, height: "100%", background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 999 }} />
                    </div>
                    <span style={{ width: 28, textAlign: "right", fontWeight: 600 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass anim-pulse-glow" style={{ position: "absolute", bottom: 0, left: 80, padding: 16, borderRadius: 18, width: 220, transform: "rotate(-2deg)" }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ fontSize: 22 }}>🔥</span>
                <div className="col" style={{ lineHeight: 1.2, gap: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.03em" }}>23 dias</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Streak ativo</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, maxWidth: 440 }}>
              Sua aprovação no ENEM começa com <span className="text-gradient-brand">prática direcionada</span>.
            </div>
            <div className="row" style={{ gap: 32 }}>
              {[
                { num: "10.842+", label: "estudantes ativos" },
                { num: "98%", label: "aprovação 1ª chamada" },
                { num: "4.9/5", label: "avaliação no app" },
              ].map((s, i) => (
                <div key={i} className="row" style={{ gap: i > 0 ? 32 : 0 }}>
                  {i > 0 && <div style={{ width: 1, background: "var(--border)", height: 32 }} />}
                  <div className="col" style={{ lineHeight: 1.1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }} className="text-gradient-green">{s.num}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ display: "grid", placeItems: "center", padding: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 24, right: 32, fontSize: 12.5, color: "var(--muted-foreground)" }}>
          Sem conta?{" "}
          <Link href="/register" style={{ color: "var(--brand-blue-light)", fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>
            Criar gratuitamente →
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="col stagger" style={{ width: "100%", maxWidth: 380, gap: 16 }}>
          <div className="col" style={{ gap: 8, marginBottom: 8 }}>
            <span className="badge badge-primary" style={{ alignSelf: "flex-start" }}>Acesso Pro</span>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Bem-vindo de volta</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Continue sua preparação onde você parou.</p>
          </div>

          <div className="col" style={{ gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} />
              <input
                className="input"
                type="email"
                placeholder="voce@email.com"
                autoComplete="email"
                {...register("email")}
              />
            </div>
            {errors.email && <p style={{ fontSize: 11, color: "var(--destructive)" }}>{errors.email.message}</p>}
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="row between">
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Senha</label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--brand-blue-light)", fontWeight: 500, textDecoration: "none" }}>
                Esqueci a senha
              </Link>
            </div>
            <div className="input-icon-wrap" style={{ position: "relative" }}>
              <Lock size={16} />
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={{ fontSize: 11, color: "var(--destructive)" }}>{errors.password.message}</p>}
          </div>

          {needs2FA && (
            <div className="col" style={{ gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Código 2FA</label>
              <input
                className="input mono"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: "center", letterSpacing: "0.3em", fontSize: 18 }}
                {...register("totp_code")}
              />
            </div>
          )}

          <label className="row" style={{ gap: 8, cursor: "pointer", fontSize: 13, color: "var(--muted-foreground)" }}>
            <span
              onClick={() => setRemember((v) => !v)}
              style={{
                width: 16, height: 16, borderRadius: 5,
                background: remember ? "var(--primary)" : "transparent",
                border: `1.5px solid ${remember ? "var(--primary)" : "var(--border-strong)"}`,
                display: "grid", placeItems: "center", flexShrink: 0, transition: "all 150ms",
              }}
            >
              {remember && <Check size={11} color="#fff" />}
            </span>
            Lembrar de mim neste dispositivo
          </label>

          <button type="submit" className="btn btn-brand btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <><span className="spinner" />&nbsp;Entrando…</>
            ) : (
              <>Entrar <ArrowRight size={16} /></>
            )}
          </button>

          <div className="row" style={{ gap: 12, color: "var(--muted-foreground)", fontSize: 12, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, background: "rgba(15,23,42,0.5)", border: "1px solid var(--border)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, background: "rgba(15,23,42,0.5)", border: "1px solid var(--border)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", textAlign: "center", marginTop: 6 }}>
            Ao continuar, você concorda com os{" "}
            <Link href="/termos" style={{ color: "#cbd5e1", textDecoration: "underline" }}>Termos</Link>{" "}
            e{" "}
            <Link href="/privacidade" style={{ color: "#cbd5e1", textDecoration: "underline" }}>Privacidade</Link>.
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
