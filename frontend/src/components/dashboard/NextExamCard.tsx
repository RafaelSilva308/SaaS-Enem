import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NextExamCard() {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={15} className="text-accent shrink-0" />
        <p className="text-sm font-medium text-muted-foreground">Próximo Simulado</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
          <ClipboardList size={22} className="text-accent/50" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Simulados disponíveis em breve</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">Etapa 2.2 do roadmap</p>
        </div>
      </div>

      <Button variant="outline" className="w-full mt-2 opacity-40 cursor-not-allowed" disabled>
        Agendar Simulado
      </Button>
    </div>
  )
}
