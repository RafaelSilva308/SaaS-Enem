"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Precisa de uma letra maiúscula")
      .regex(/[0-9]/, "Precisa de um número"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  })
type FormData = z.infer<typeof schema>

function ResetPasswordPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Link inválido — sem token na URL
  if (!token) {
    return (
      <div className="auth-simple-wrap">
      <div className="glass rounded-2xl p-8 space-y-4 text-center">
        <h1 className="text-xl font-bold text-destructive">Link inválido</h1>
        <p className="text-muted-foreground text-sm">
          Este link de redefinição é inválido ou expirou. Solicite um novo.
        </p>
        <Link href="/forgot-password">
          <Button className="gradient-blue hover:opacity-90 font-semibold">Solicitar novo link</Button>
        </Link>
      </div>
      </div>
    )
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    if (!token) return toast.error("Token inválido")
    setLoading(true)
    try {
      await api.post("/auth/reset-password", { token, new_password: values.new_password })
      setDone(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Token inválido ou expirado")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="auth-simple-wrap">
      <div className="glass rounded-2xl p-8 space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/20 mb-2">
          <CheckCircle size={28} className="text-secondary" />
        </div>
        <h1 className="text-2xl font-bold">Senha redefinida!</h1>
        <p className="text-muted-foreground text-sm">
          Sua senha foi atualizada com sucesso. Faça login com a nova senha.
        </p>
        <Link href="/login">
          <Button className="mt-2 gradient-blue hover:opacity-90 font-semibold">Ir para o login</Button>
        </Link>
      </div>
      </div>
    )
  }

  return (
    <div className="auth-simple-wrap">
    <div className="glass rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Nova senha</h1>
        <p className="text-muted-foreground text-sm">Digite e confirme sua nova senha.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new_password">Nova senha</Label>
          <div className="relative">
            <Input
              id="new_password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              className="bg-white/5 border-white/10 focus:border-primary pr-10"
              {...register("new_password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-destructive text-xs">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirmar senha</Label>
          <Input
            id="confirm_password"
            type={showPassword ? "text" : "password"}
            placeholder="Repita a senha"
            className="bg-white/5 border-white/10 focus:border-primary"
            {...register("confirm_password")}
          />
          {errors.confirm_password && (
            <p className="text-destructive text-xs">{errors.confirm_password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-blue hover:opacity-90 font-semibold"
        >
          {loading && <Loader2 className="animate-spin mr-2" size={16} />}
          {loading ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageInner />
    </Suspense>
  )
}
