"use client"

import { useState } from "react"
import { X, Zap, BookOpen, BarChart2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ExamType = "complete" | "by_subject" | "quiz"

interface ExamTypeOption {
  id: ExamType
  icon: React.ReactNode
  label: string
  desc: string
  questions: number
  duration: string
}

const EXAM_TYPES: ExamTypeOption[] = [
  {
    id: "quiz",
    icon: <Zap size={20} />,
    label: "Quiz Rápido",
    desc: "5 questões aleatórias",
    questions: 5,
    duration: "10 min",
  },
  {
    id: "by_subject",
    icon: <BarChart2 size={20} />,
    label: "Por Área",
    desc: "10 questões da disciplina escolhida",
    questions: 10,
    duration: "45 min",
  },
  {
    id: "complete",
    icon: <BookOpen size={20} />,
    label: "Simulado Completo",
    desc: "40 questões de todas as áreas",
    questions: 40,
    duration: "180 min",
  },
]

const SUBJECTS = [
  { value: "linguagens", label: "Linguagens" },
  { value: "matematica", label: "Matemática" },
  { value: "cn", label: "Ciências da Natureza" },
  { value: "ch", label: "Ciências Humanas" },
]

interface Props {
  onClose: () => void
  onCreate: (type: ExamType, subject?: string) => Promise<void>
}

export function CreateExamModal({ onClose, onCreate }: Props) {
  const [selectedType, setSelectedType] = useState<ExamType>("quiz")
  const [selectedSubject, setSelectedSubject] = useState("linguagens")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onCreate(selectedType, selectedType === "by_subject" ? selectedSubject : undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl w-full max-w-md shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold">Novo Simulado</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Exam type selection */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</p>
              <div className="space-y-2">
                {EXAM_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      selectedType === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-border/60 hover:bg-muted/20",
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      selectedType === t.id ? "bg-primary/20" : "bg-muted/40",
                    )}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">{t.questions}q</p>
                      <p className="text-[11px] text-muted-foreground">{t.duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject selection (only for by_subject) */}
            {selectedType === "by_subject" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disciplina</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedSubject(s.value)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                        selectedSubject === s.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-border/60",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gradient-brand text-white gap-2"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              Iniciar
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
