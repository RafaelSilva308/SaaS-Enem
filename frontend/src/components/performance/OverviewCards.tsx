import { Clock, Target, Flame, ClipboardList, BookCheck } from "lucide-react"

interface OverviewData {
  hours_studied: number
  questions_answered: number
  accuracy_rate: number
  current_streak: number
  exams_completed: number
  topics_completed: number
  topics_total: number
  plan_progress: number
}

interface Props { data: OverviewData }

interface CardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
}

function KPICard({ icon, label, value, sub, color }: CardProps) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

export function OverviewCards({ data }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard
        icon={<Clock size={18} />}
        label="Horas estudadas"
        value={`${data.hours_studied}h`}
        color="#2563eb"
      />
      <KPICard
        icon={<Target size={18} />}
        label="Taxa de acerto"
        value={`${data.accuracy_rate}%`}
        sub={`${data.questions_answered} questões`}
        color="#10b981"
      />
      <KPICard
        icon={<Flame size={18} />}
        label="Streak atual"
        value={`${data.current_streak} dias`}
        color="#f59e0b"
      />
      <KPICard
        icon={<ClipboardList size={18} />}
        label="Simulados"
        value={String(data.exams_completed)}
        color="#7c3aed"
      />
    </div>
  )
}
