"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Brain, CheckCircle, ChevronRight, Loader2,
  Sparkles, Target, Trophy, Zap,
} from "lucide-react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { CheckoutModal } from "@/components/subscription/CheckoutModal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────
type AssessmentLevel = "weak" | "moderate" | "strong"

interface SubjectScore {
  subject: string; label: string; score: number
  correct: number; total: number; level: "weak" | "moderate" | "strong"
}
interface WeakArea { subject: string; label: string; score: number; recommendation: string }
interface DiagnosticResult {
  diagnostic_id: string; scores: SubjectScore[]
  weak_areas: WeakArea[]; estimated_hours: number
  overall_score: number; learning_profile: string
}

const SUBJECT_LABELS: Record<string, string> = {
  linguagens: "Linguagens", matematica: "Matemática",
  cn: "Ciências da Natureza", ch: "Ciências Humanas",
}
const SUBJECT_COLORS: Record<string, string> = {
  linguagens: "#2563eb", matematica: "#10b981", cn: "#7c3aed", ch: "#f59e0b",
}
const TOTAL_STEPS = 5

// ── Step indicator ────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  const labels = ["Boas-vindas", "Perfil", "Diagnóstico", "Resultado", "Plano"]
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all",
            i + 1 === current ? "gradient-blue text-white scale-110" :
            i + 1 < current ? "bg-secondary/20 text-secondary" :
            "bg-white/5 text-muted-foreground"
          )}>
            {i + 1 < current ? <CheckCircle size={14} /> : i + 1}
          </div>
          {i < labels.length - 1 && (
            <div className={cn("h-px w-8 transition-colors", i + 1 < current ? "bg-secondary/40" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Welcome ───────────────────────────────────────────────
function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  const features = [
    { icon: Brain, label: "Plano personalizado por IA", color: "text-primary" },
    { icon: Target, label: "Simulados com estimativa TRI", color: "text-secondary" },
    { icon: Trophy, label: "Gamificação e ranking", color: "text-accent" },
    { icon: Zap, label: "Correção de redação por IA", color: "text-yellow-400" },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center">
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-brand mb-2 glow-blue">
          <Sparkles size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold">
          Olá, <span className="text-gradient-brand">{name}!</span>
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Vamos personalizar sua jornada de estudos para o ENEM. O processo leva cerca de 40 minutos.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {features.map(({ icon: Icon, label, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-left space-y-2">
            <Icon size={20} className={color} />
            <p className="text-xs text-muted-foreground leading-snug">{label}</p>
          </div>
        ))}
      </div>
      <Button onClick={onNext} className="gradient-blue hover:opacity-90 font-semibold px-8">
        Começar <ChevronRight size={16} className="ml-1" />
      </Button>
    </motion.div>
  )
}

// ── Step 2: Profile ───────────────────────────────────────────────
const LEARNING_STYLES = [
  { value: "visual", label: "Visual", desc: "Aprendo melhor com imagens, gráficos e vídeos" },
  { value: "auditory", label: "Auditivo", desc: "Prefiro explicações em áudio e discussões" },
  { value: "kinesthetic", label: "Cinestésico", desc: "Aprendo fazendo exercícios e praticando" },
]
const TIMES = [
  { value: "morning", label: "Manhã", desc: "6h – 12h" },
  { value: "afternoon", label: "Tarde", desc: "12h – 18h" },
  { value: "evening", label: "Noite", desc: "18h – 23h" },
]
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

interface ProfileData {
  learning_style: string; preferred_time: string
  daily_hours_goal: number; available_days: string[]
}

function StepProfile({ data, onChange, onNext }: {
  data: ProfileData; onChange: (d: ProfileData) => void; onNext: () => void
}) {
  const toggleDay = (day: string) => {
    const days = data.available_days.includes(day)
      ? data.available_days.filter(d => d !== day)
      : [...data.available_days, day]
    onChange({ ...data, available_days: days })
  }

  const isValid = data.learning_style && data.preferred_time && data.available_days.length > 0

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Seu perfil de estudos</h2>
        <p className="text-muted-foreground text-sm">Vamos adaptar o plano à sua rotina</p>
      </div>

      {/* Learning style */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Como você aprende melhor?</p>
        <div className="grid gap-2">
          {LEARNING_STYLES.map(({ value, label, desc }) => (
            <button key={value} onClick={() => onChange({ ...data, learning_style: value })}
              className={cn("text-left p-3 rounded-xl border transition-all",
                data.learning_style === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              )}>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred time */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Melhor horário para estudar</p>
        <div className="grid grid-cols-3 gap-2">
          {TIMES.map(({ value, label, desc }) => (
            <button key={value} onClick={() => onChange({ ...data, preferred_time: value })}
              className={cn("p-3 rounded-xl border text-center transition-all",
                data.preferred_time === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              )}>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily hours */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Horas de estudo por dia: <span className="text-primary font-bold">{data.daily_hours_goal}h</span></p>
        <input type="range" min={1} max={8} step={0.5} value={data.daily_hours_goal}
          onChange={e => onChange({ ...data, daily_hours_goal: parseFloat(e.target.value) })}
          className="w-full accent-blue-500" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>1h</span><span>8h</span></div>
      </div>

      {/* Available days */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Dias disponíveis</p>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(day => (
            <button key={day} onClick={() => toggleDay(day.toLowerCase().slice(0, 3))}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                data.available_days.includes(day.toLowerCase().slice(0, 3))
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
              )}>
              {day}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onNext} disabled={!isValid}
        className="w-full gradient-blue hover:opacity-90 font-semibold">
        Iniciar diagnóstico <ChevronRight size={16} className="ml-1" />
      </Button>
    </motion.div>
  )
}

// ── Step 3: Self Assessment ───────────────────────────────────────
const SUBJECTS_CONFIG = [
  { key: "linguagens", label: "Linguagens & Códigos", icon: "📚", desc: "Português, Literatura, Inglês, Artes" },
  { key: "matematica", label: "Matemática",            icon: "🔢", desc: "Álgebra, Geometria, Estatística" },
  { key: "cn",         label: "Ciências da Natureza",  icon: "🔬", desc: "Física, Química, Biologia" },
  { key: "ch",         label: "Ciências Humanas",      icon: "🌍", desc: "História, Geografia, Filosofia, Sociologia" },
]

const LEVELS: { value: AssessmentLevel; label: string; desc: string; color: string }[] = [
  { value: "weak",     label: "Fraco",   desc: "Tenho dificuldade",    color: "border-red-500/50 bg-red-500/10 text-red-400" },
  { value: "moderate", label: "Regular", desc: "Sei o básico",         color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
  { value: "strong",   label: "Forte",   desc: "Tenho domínio",        color: "border-green-500/50 bg-green-500/10 text-green-400" },
]

function StepSelfAssessment({
  assessments, onChange, onSubmit, loading,
}: {
  assessments: Record<string, AssessmentLevel>
  onChange: (subj: string, level: AssessmentLevel) => void
  onSubmit: () => void
  loading: boolean
}) {
  const allAnswered = SUBJECTS_CONFIG.every(s => assessments[s.key])

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Como você está em cada área?</h2>
        <p className="text-muted-foreground text-sm">Seja honesto — isso personaliza seu plano de estudos</p>
      </div>

      <div className="space-y-4">
        {SUBJECTS_CONFIG.map(subj => (
          <div key={subj.key} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{subj.icon}</span>
              <div>
                <p className="font-semibold text-sm">{subj.label}</p>
                <p className="text-xs text-muted-foreground">{subj.desc}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => onChange(subj.key, level.value)}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-center transition-all text-xs font-medium",
                    assessments[subj.key] === level.value
                      ? level.color
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                  )}
                >
                  <p className="font-bold">{level.label}</p>
                  <p className="opacity-70 text-[10px]">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={onSubmit}
        disabled={!allAnswered || loading}
        className="w-full gradient-brand hover:opacity-90 font-semibold"
      >
        {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
        {loading ? "Gerando seu diagnóstico…" : "Ver meu diagnóstico"}
      </Button>
    </motion.div>
  )
}

// ── Step 4: Results ───────────────────────────────────────────────
function StepResults({ result, onNext }: { result: DiagnosticResult; onNext: () => void }) {
  const levelColor = { weak: "#ef4444", moderate: "#f59e0b", strong: "#10b981" }
  const levelLabel = { weak: "Ponto fraco", moderate: "Moderado", strong: "Forte" }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Seu diagnóstico</h2>
        <p className="text-muted-foreground text-sm">Veja como você está em cada área do ENEM</p>
      </div>

      {/* Overall score */}
      <div className="glass rounded-2xl p-6 text-center glow-blue">
        <p className="text-muted-foreground text-sm mb-1">Pontuação geral</p>
        <motion.p
          className="text-5xl font-bold text-gradient-brand"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          {result.overall_score}%
        </motion.p>
        <p className="text-muted-foreground text-xs mt-1">
          ~{result.estimated_hours}h de estudo recomendadas
        </p>
      </div>

      {/* Subject bars */}
      <div className="space-y-3">
        {result.scores.map((score, i) => (
          <motion.div key={score.subject} className="glass rounded-xl p-4 space-y-2"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{score.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{score.correct}/{score.total}</span>
                <span className="font-bold" style={{ color: levelColor[score.level] }}>
                  {score.score}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: SUBJECT_COLORS[score.subject] }}
                initial={{ width: 0 }}
                animate={{ width: `${score.score}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs" style={{ color: levelColor[score.level] }}>
              {levelLabel[score.level]}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Weak areas */}
      {result.weak_areas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Áreas prioritárias no seu plano:</p>
          {result.weak_areas.map(area => (
            <div key={area.subject} className="glass rounded-xl p-3 border border-destructive/20">
              <p className="text-sm font-medium">{area.label} — {area.score}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{area.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onNext} className="w-full gradient-brand hover:opacity-90 font-semibold">
        Escolher meu plano <ChevronRight size={16} className="ml-1" />
      </Button>
    </motion.div>
  )
}

// ── Step 5: Plan Selection ───────────────────────────────────────
interface PlanData {
  id: string; label: string; price: number; period: string
  features: string[]; highlight: boolean
}
const PLANS_DATA: PlanData[] = [
  { id: "free",        label: "Grátis",   price: 0,      period: "para sempre",  highlight: false,
    features: ["Diagnóstico", "Plano 4 semanas", "20 questões/dia", "1 simulado/mês"] },
  { id: "premium_1m",  label: "1 mês",    price: 59.90,  period: "/mês",         highlight: false,
    features: ["Plano completo", "Simulados ilimitados", "Score TRI", "Correção de redação IA"] },
  { id: "premium_3m",  label: "3 meses",  price: 99.90,  period: "/trimestre",   highlight: true,
    features: ["Tudo do 1 mês", "Análise comparativa", "Mentoria 1x/mês"] },
  { id: "premium_6m",  label: "6 meses",  price: 149.90, period: "/semestre",    highlight: false,
    features: ["Tudo do 3 meses", "Mentoria 2x/mês", "Suporte prioritário"] },
]

function StepPlan({ onFinish, loading }: { onFinish: () => void; loading: boolean }) {
  const [selected, setSelected] = useState("premium_3m")
  const [showCheckout, setShowCheckout] = useState(false)
  const selectedPlan = PLANS_DATA.find(p => p.id === selected)!

  async function handleContinue() {
    if (selected === "free") {
      // Ativar freemium diretamente — sem checkout
      try {
        await api.post("/subscriptions/activate-free")
      } catch { /* ignora se já existe */ }
      onFinish()
    } else {
      setShowCheckout(true)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1">Escolha seu plano</h2>
          <p className="text-muted-foreground text-sm">Cancele quando quiser · 7 dias grátis nos planos pagos</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PLANS_DATA.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={cn(
                "relative text-left p-4 rounded-xl border transition-all",
                selected === plan.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20",
                plan.highlight && "ring-1 ring-secondary/40"
              )}>
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  Mais popular
                </span>
              )}
              <p className="font-bold text-sm">{plan.label}</p>
              <p className="text-lg font-bold text-gradient-brand">
                {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2).replace(".", ",")}`}
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

        <Button onClick={handleContinue} disabled={loading} className="w-full gradient-brand hover:opacity-90 font-semibold">
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles size={16} className="mr-2" />}
          {loading ? "Aguarde…" : selected === "free" ? "Continuar grátis" : "Iniciar trial de 7 dias"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {selected !== "free" && "7 dias grátis, cancele antes sem custo. "}
          Pagamento seguro via Stripe.
        </p>
      </motion.div>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutModal
            planId={selectedPlan.id}
            planName={selectedPlan.label}
            planPrice={selectedPlan.price}
            onSuccess={onFinish}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<ProfileData>({
    learning_style: "", preferred_time: "", daily_hours_goal: 2, available_days: [],
  })
  const [assessments, setAssessments] = useState<Record<string, AssessmentLevel>>({})
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get("/diagnostic/status")
      .then(({ data }) => {
        if (data.has_completed) router.replace("/dashboard")
      })
      .catch((err) => {
        if (err.response?.status !== 422 && err.response?.status !== 500) return
        toast.error("Erro ao verificar status. Continuando onboarding.")
      })
  }, [])

  async function handleSubmitAssessment() {
    setSubmitting(true)
    try {
      const payload = {
        learning_profile: {
          learning_style: profile.learning_style,
          preferred_time: profile.preferred_time,
          daily_hours_goal: profile.daily_hours_goal,
          available_days: profile.available_days,
        },
        assessments,
      }
      const { data } = await api.post("/diagnostic/self-assessment", payload)
      setDiagnosticResult(data)
      setStep(4)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Erro ao enviar diagnóstico")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinish() {
    // Stage 1.3 implementará a criação real da assinatura via Asaas
    // Por enquanto redireciona direto para o dashboard
    router.replace("/dashboard")
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <StepDots current={step} />

        <div className="glass rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepWelcome key="welcome" name={user?.name?.split(" ")[0] ?? "estudante"} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <StepProfile key="profile" data={profile} onChange={setProfile} onNext={() => setStep(3)} />
            )}
            {step === 3 && (
              <StepSelfAssessment
                key="self-assessment"
                assessments={assessments}
                onChange={(subj, level) => setAssessments(prev => ({ ...prev, [subj]: level }))}
                onSubmit={handleSubmitAssessment}
                loading={submitting}
              />
            )}
            {step === 4 && diagnosticResult && (
              <StepResults key="results" result={diagnosticResult} onNext={() => setStep(5)} />
            )}
            {step === 5 && (
              <StepPlan key="plan" onFinish={handleFinish} loading={submitting} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
