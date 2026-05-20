"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  totp_code: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/app/dashboard"
  const { setAuth } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
    <div className="glass rounded-2xl p-8 space-y-6">
      {/* Logo */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-brand mb-3">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
        <p className="text-muted-foreground text-sm">Acesse sua conta SaaS ENEM</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            className="bg-white/5 border-white/10 focus:border-primary"
            {...register("email")}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="bg-white/5 border-white/10 focus:border-primary pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        {needs2FA && (
          <div className="space-y-1.5">
            <Label htmlFor="totp_code">Código de autenticação (2FA)</Label>
            <Input
              id="totp_code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              className="bg-white/5 border-white/10 focus:border-primary tracking-widest text-center text-lg"
              {...register("totp_code")}
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-blue hover:opacity-90 transition-opacity font-semibold"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <LogIn size={16} className="mr-2" />}
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  )
}
