"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Option { letter: string; text: string }
interface AdminQuestion {
  id: string; source: string | null; subject: string | null; topic: string | null
  difficulty: string | null; year: number | null; statement: string
  correct_answer: string | null; options: Option[]; created_at: string
}
interface QuestionsResponse {
  items: AdminQuestion[]; total: number; page: number; per_page: number
}

const SUBJECTS = [
  { value: "linguagens", label: "Linguagens" },
  { value: "matematica", label: "Matemática" },
  { value: "cn",         label: "Ciências da Natureza" },
  { value: "ch",         label: "Ciências Humanas" },
]
const DIFFICULTIES = [
  { value: "easy",   label: "Fácil" },
  { value: "medium", label: "Médio" },
  { value: "hard",   label: "Difícil" },
]
const LETTERS = ["A", "B", "C", "D", "E"]

interface FormValues {
  subject: string; topic: string; difficulty: string; year: string; source: string
  statement: string; correct_answer: string; explanation: string
  option_a: string; option_b: string; option_c: string; option_d: string; option_e: string
}

function QuestionModal({
  question, onClose, onSaved,
}: { question: AdminQuestion | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = question !== null
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: isEdit ? {
      subject: question.subject ?? "",
      topic: question.topic ?? "",
      difficulty: question.difficulty ?? "medium",
      year: question.year?.toString() ?? "",
      source: question.source ?? "",
      statement: question.statement,
      correct_answer: question.correct_answer ?? "A",
      explanation: "",
      option_a: question.options.find(o => o.letter === "A")?.text ?? "",
      option_b: question.options.find(o => o.letter === "B")?.text ?? "",
      option_c: question.options.find(o => o.letter === "C")?.text ?? "",
      option_d: question.options.find(o => o.letter === "D")?.text ?? "",
      option_e: question.options.find(o => o.letter === "E")?.text ?? "",
    } : {
      subject: "matematica", topic: "", difficulty: "medium", year: "", source: "",
      statement: "", correct_answer: "A", explanation: "",
      option_a: "", option_b: "", option_c: "", option_d: "", option_e: "",
    },
  })

  async function onSubmit(values: FormValues) {
    const payload = {
      subject: values.subject,
      topic: values.topic || null,
      difficulty: values.difficulty,
      year: values.year ? parseInt(values.year) : null,
      source: values.source || null,
      statement: values.statement,
      correct_answer: values.correct_answer,
      explanation: values.explanation || null,
      options: [
        { letter: "A", text: values.option_a },
        { letter: "B", text: values.option_b },
        { letter: "C", text: values.option_c },
        { letter: "D", text: values.option_d },
        { letter: "E", text: values.option_e },
      ],
    }
    try {
      if (isEdit) {
        await api.patch(`/admin/questions/${question.id}`, payload)
        toast.success("Questão atualizada!")
      } else {
        await api.post("/admin/questions", payload)
        toast.success("Questão criada!")
      }
      onSaved()
      onClose()
    } catch {
      toast.error("Erro ao salvar questão")
    }
  }

  const field = "bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-primary/50 transition-colors"
  const label = "text-xs font-medium text-muted-foreground mb-1 block"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold">{isEdit ? "Editar questão" : "Nova questão"}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* Row 1: subject, difficulty, year, source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Disciplina *</label>
                <select {...register("subject", { required: true })} className={field}>
                  {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Dificuldade *</label>
                <select {...register("difficulty", { required: true })} className={field}>
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Tópico</label>
                <input {...register("topic")} placeholder="Ex: Funções do 1° Grau" className={field} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Ano</label>
                  <input {...register("year")} type="number" placeholder="2023" className={field} />
                </div>
                <div>
                  <label className={label}>Fonte</label>
                  <input {...register("source")} placeholder="enem_2023" className={field} />
                </div>
              </div>
            </div>

            {/* Statement */}
            <div>
              <label className={label}>Enunciado *</label>
              <textarea
                {...register("statement", { required: "Enunciado obrigatório" })}
                rows={4}
                className={cn(field, "resize-none")}
                placeholder="Texto da questão…"
              />
              {errors.statement && <p className="text-xs text-destructive mt-1">{errors.statement.message}</p>}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className={label}>Alternativas *</label>
              {LETTERS.map(letter => {
                const key = `option_${letter.toLowerCase()}` as keyof FormValues
                return (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[11px] font-bold shrink-0 text-muted-foreground">
                      {letter}
                    </span>
                    <input
                      {...register(key, { required: true })}
                      placeholder={`Alternativa ${letter}…`}
                      className={cn(field, errors[key] && "border-destructive/60")}
                    />
                  </div>
                )
              })}
            </div>

            {/* Correct answer */}
            <div>
              <label className={label}>Resposta correta *</label>
              <select {...register("correct_answer", { required: true })} className={cn(field, "w-32")}>
                {LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Explanation */}
            <div>
              <label className={label}>Explicação (opcional)</label>
              <textarea {...register("explanation")} rows={3}
                className={cn(field, "resize-none")} placeholder="Explicação da resposta…" />
            </div>
          </div>

          <div className="flex gap-3 px-5 pb-5 shrink-0">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}
              className="flex-1 gradient-blue hover:opacity-90 font-semibold gap-2">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEdit ? "Salvar alterações" : "Criar questão"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminQuestionsPage() {
  const [data, setData] = useState<QuestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")
  const [diffFilter, setDiffFilter] = useState("")
  const [modalQuestion, setModalQuestion] = useState<AdminQuestion | "new" | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get("/admin/questions", {
        params: {
          page, per_page: 20,
          subject: subjectFilter || undefined,
          difficulty: diffFilter || undefined,
          search: search || undefined,
        },
      })
      setData(res)
    } catch {
      toast.error("Erro ao carregar questões")
    } finally {
      setLoading(false)
    }
  }, [page, search, subjectFilter, diffFilter])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const handleDelete = async (q: AdminQuestion) => {
    if (!confirm("Deletar esta questão permanentemente?")) return
    setDeleting(q.id)
    try {
      await api.delete(`/admin/questions/${q.id}`)
      toast.success("Questão deletada.")
      fetchQuestions()
    } catch {
      toast.error("Erro ao deletar questão")
    } finally {
      setDeleting(null)
    }
  }

  const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.value, s.label]))
  const DIFF_MAP = Object.fromEntries(DIFFICULTIES.map(d => [d.value, d.label]))
  const DIFF_COLORS: Record<string, string> = {
    easy: "bg-emerald-500/15 text-emerald-400",
    medium: "bg-amber-500/15 text-amber-400",
    hard: "bg-red-500/15 text-red-400",
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total.toLocaleString("pt-BR")} questões no banco` : "…"}
          </p>
        </div>
        <Button onClick={() => setModalQuestion("new")} className="gradient-blue hover:opacity-90 font-semibold gap-2">
          <Plus size={14} /> Nova questão
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (setSearch(searchInput), setPage(1))}
            placeholder="Buscar no enunciado…"
            className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          />
          <Button variant="outline" size="sm" onClick={() => { setSearch(searchInput); setPage(1) }}>
            <Search size={14} />
          </Button>
        </div>
        <select
          value={subjectFilter}
          onChange={e => { setSubjectFilter(e.target.value); setPage(1) }}
          className="bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
        >
          <option value="">Todas as disciplinas</option>
          {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={diffFilter}
          onChange={e => { setDiffFilter(e.target.value); setPage(1) }}
          className="bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
        >
          <option value="">Todas as dificuldades</option>
          {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <p className="text-center text-sm text-muted-foreground py-16">Nenhuma questão encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Enunciado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nível</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Ano</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.items.map(q => (
                <tr key={q.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="text-sm leading-snug line-clamp-2">{q.statement}</p>
                    {q.topic && <p className="text-[11px] text-muted-foreground mt-0.5">{q.topic}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {q.subject ? (SUBJECT_MAP[q.subject] ?? q.subject) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {q.difficulty && (
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", DIFF_COLORS[q.difficulty] ?? "")}>
                        {DIFF_MAP[q.difficulty] ?? q.difficulty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{q.year ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setModalQuestion(q)}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deleting === q.id}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title="Deletar"
                      >
                        {deleting === q.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalQuestion !== null && (
        <QuestionModal
          question={modalQuestion === "new" ? null : modalQuestion}
          onClose={() => setModalQuestion(null)}
          onSaved={fetchQuestions}
        />
      )}
    </div>
  )
}
