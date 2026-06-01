"use client"

import { useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  date_of_birth: z.string().min(1, "Data de nascimento obrigatória"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Precisa de uma letra maiúscula")
    .regex(/[0-9]/, "Precisa de um número"),
})
type FormData = z.infer<typeof schema>

function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => {
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])

  if (!password) return null

  const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"]
  const colors = [
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-secondary",
    "bg-secondary",
  ]

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const handleDobChange = useCallback(
    (day: string, month: string, year: string) => {
      if (day && month && year) {
        setValue("date_of_birth", `${year}-${month}-${day}`, { shouldValidate: true })
      } else {
        setValue("date_of_birth", "")
      }
    },
    [setValue]
  )

  const password = watch("password", "")

  async function onSubmit(values: FormData) {
    setLoading(true)
    try {
      await api.post("/auth/register", values)
      toast.success("Cadastro realizado! Verifique seu e-mail.")
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao cadastrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-simple-wrap">
    <div className="glass rounded-2xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-brand mb-3">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
        <p className="text-muted-foreground text-sm">Comece sua jornada rumo à aprovação</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            placeholder="Seu nome"
            autoComplete="name"
            className="bg-white/5 border-white/10 focus:border-primary"
            {...register("name")}
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

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
          <Label>Data de nascimento</Label>
          <input type="hidden" {...register("date_of_birth")} />
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                placeholder: "Dia",
                value: dobDay,
                onChange: (v: string) => { setDobDay(v); handleDobChange(v, dobMonth, dobYear) },
                options: Array.from({ length: 31 }, (_, i) => {
                  const d = String(i + 1).padStart(2, "0")
                  return <option key={d} value={d}>{i + 1}</option>
                }),
              },
              {
                placeholder: "Mês",
                value: dobMonth,
                onChange: (v: string) => { setDobMonth(v); handleDobChange(dobDay, v, dobYear) },
                options: [
                  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
                ].map((m, i) => {
                  const val = String(i + 1).padStart(2, "0")
                  return <option key={val} value={val}>{m}</option>
                }),
              },
              {
                placeholder: "Ano",
                value: dobYear,
                onChange: (v: string) => { setDobYear(v); handleDobChange(dobDay, dobMonth, v) },
                options: Array.from({ length: 71 }, (_, i) => {
                  const y = String(2010 - i)
                  return <option key={y} value={y}>{y}</option>
                }),
              },
            ].map(({ placeholder, value, onChange, options }) => (
              <select
                key={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-0"
              >
                <option value="" disabled>{placeholder}</option>
                {options}
              </select>
            ))}
          </div>
          {errors.date_of_birth && (
            <p className="text-destructive text-xs">{errors.date_of_birth.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
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
          <PasswordStrength password={password} />
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-blue hover:opacity-90 transition-opacity font-semibold"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <UserPlus size={16} className="mr-2" />
          )}
          {loading ? "Criando conta…" : "Criar conta grátis"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
    </div>
  )
}
