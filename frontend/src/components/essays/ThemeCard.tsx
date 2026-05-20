"use client"

import { BookOpen, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Theme {
  id: string
  title: string
  description: string | null
  year: number | null
  source: string | null
}

interface Props {
  theme: Theme
  onSelect: (theme: Theme) => void
}

export function ThemeCard({ theme, onSelect }: Props) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen size={17} className="text-primary" />
        </div>
        <div className="min-w-0">
          {theme.year && (
            <span className="text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
              ENEM {theme.year}
            </span>
          )}
          <p className="text-sm font-semibold leading-snug mt-1.5 line-clamp-3">
            {theme.title}
          </p>
        </div>
      </div>

      {theme.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {theme.description}
        </p>
      )}

      <Button
        className="w-full gradient-brand text-white gap-2 mt-auto"
        onClick={() => onSelect(theme)}
      >
        Escrever sobre este tema
        <ChevronRight size={15} />
      </Button>
    </div>
  )
}
