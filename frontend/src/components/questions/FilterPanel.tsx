"use client"

import { Button } from "@/components/ui/button"

export interface Filters {
  subject: string
  difficulty: string
  year: string
  source: string
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  onClear: () => void
}

const SUBJECTS = [
  { value: "", label: "Todas as áreas" },
  { value: "linguagens", label: "Linguagens" },
  { value: "matematica", label: "Matemática" },
  { value: "cn", label: "Ciências da Natureza" },
  { value: "ch", label: "Ciências Humanas" },
]

const DIFFICULTIES = [
  { value: "", label: "Todas" },
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Média" },
  { value: "hard", label: "Difícil" },
]

const YEARS = [
  { value: "", label: "Todos os anos" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
]

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function FilterPanel({ filters, onChange, onClear }: Props) {
  const hasActive = Object.values(filters).some(Boolean)

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <p className="text-sm font-semibold">Filtros</p>

      <Select
        label="Área"
        value={filters.subject}
        options={SUBJECTS}
        onChange={(v) => onChange({ ...filters, subject: v })}
      />
      <Select
        label="Dificuldade"
        value={filters.difficulty}
        options={DIFFICULTIES}
        onChange={(v) => onChange({ ...filters, difficulty: v })}
      />
      <Select
        label="Ano"
        value={filters.year}
        options={YEARS}
        onChange={(v) => onChange({ ...filters, year: v })}
      />

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
