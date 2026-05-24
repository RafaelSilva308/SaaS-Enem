"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({ email: z.string().email("E-mail inválido") })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormData) {
    setLoading(true)
    try {
      await api.post("/auth/forgot-password", values)
      setSent(true)
    } catch {
      toast.error("Erro ao enviar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-simple-wrap">
      <div className="glass rounded-2xl p-8 space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/20 mb-2">
          <Send size={28} className="text-secondary" />
        </div>
        <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
        <p className="text-muted-foreground text-sm">
          Se o e-mail <span className="text-foreground font-medium">{getValues("email")}</span> estiver
          cadastrado, você receberá as instruções de redefinição em breve.
        </p>
        <Link href="/login">
          <Button variant="outline" className="mt-4 border-white/10">
            <ArrowLeft size={14} className="mr-2" /> Voltar para o login
          </Button>
        </Link>
      </div>
      </div>
    )
  }

  return (
    <div className="auth-simple-wrap">
    <div className="glass rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
        <p className="text-muted-foreground text-sm">
          Digite seu e-mail e enviaremos um link de redefinição.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="bg-white/5 border-white/10 focus:border-primary"
            {...register("email")}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-blue hover:opacity-90 font-semibold"
        >
          {loading && <Loader2 className="animate-spin mr-2" size={16} />}
          {loading ? "Enviando…" : "Enviar link de redefinição"}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Voltar para o login
      </Link>
    </div>
    </div>
  )
}
