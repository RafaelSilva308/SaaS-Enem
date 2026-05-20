"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, Bell, CreditCard, Download, Loader2,
  LogOut, Shield, Trash2, User,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

type Tab = "conta" | "notificacoes"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { clearAuth } = useAuthStore()
  const [tab, setTab] = useState<Tab>("conta")
  const [deleting, setDeleting] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [requestingPush, setRequestingPush] = useState(false)

  const { user } = useAuthStore()

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get("/auth/me/export", { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "meus-dados-enem-pro.json"
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
      toast.success("Dados exportados com sucesso!")
    } catch {
      toast.error("Erro ao exportar dados")
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      toast.error("E-mail não confere. Digite exatamente seu e-mail para confirmar.")
      return
    }
    setDeleting(true)
    try {
      await api.delete("/auth/me")
      toast.success("Conta excluída. Até logo!")
      clearAuth()
      router.replace("/")
    } catch {
      toast.error("Erro ao excluir conta")
    } finally {
      setDeleting(false)
    }
  }

  const handleRequestPush = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações push.")
      return
    }
    setRequestingPush(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setPushEnabled(true)
        toast.success("Notificações push ativadas!")
      } else {
        toast.error("Permissão negada. Habilite nas configurações do navegador.")
      }
    } finally {
      setRequestingPush(false)
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "conta",         label: "Conta",         icon: User },
    { id: "notificacoes",  label: "Notificações",  icon: Bell },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua conta e preferências</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Conta ── */}
      {tab === "conta" && (
        <div className="space-y-4">
          {/* Assinatura shortcut */}
          <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Assinatura</p>
                <p className="text-xs text-muted-foreground">Gerencie seu plano e pagamentos</p>
              </div>
            </div>
            <Link href="/app/configuracoes/billing">
              <Button variant="outline" size="sm">Ver plano</Button>
            </Link>
          </div>

          {/* Export data */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Download size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Exportar meus dados</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Baixe um arquivo JSON com todos os seus dados (LGPD — direito de portabilidade).
                  Inclui perfil, histórico de simulados, redações e pontuação.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {exporting ? "Exportando…" : "Exportar dados"}
            </Button>
          </div>

          {/* Delete account */}
          <div className="glass rounded-2xl p-5 border border-destructive/20">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">Excluir conta</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Esta ação é irreversível. Seus dados serão anonimizados imediatamente
                  e assinaturas ativas serão canceladas.
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={13} />
                Excluir minha conta
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-destructive/8 rounded-xl text-xs text-destructive/80">
                  <AlertTriangle size={13} className="shrink-0" />
                  Para confirmar, digite seu e-mail: <strong>{user?.email}</strong>
                </div>
                <input
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-muted/30 border border-destructive/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-destructive/60 transition-colors"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDeleteConfirm(false); setConfirmEmail("") }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleting || confirmEmail !== user?.email}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-white gap-2"
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {deleting ? "Excluindo…" : "Excluir definitivamente"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Links legais */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      )}

      {/* ── Notificações ── */}
      {tab === "notificacoes" && (
        <div className="space-y-4">
          {/* Push */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Notificações push</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receba alertas mesmo com o app fechado
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={pushEnabled ? "outline" : "default"}
                onClick={handleRequestPush}
                disabled={requestingPush || pushEnabled}
                className={cn("gap-2 shrink-0", !pushEnabled && "gradient-blue hover:opacity-90 text-white")}
              >
                {requestingPush ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                {pushEnabled ? "Ativado" : "Ativar"}
              </Button>
            </div>
          </div>

          {/* Notification types info */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold mb-3">Você recebe notificações de:</p>
            {[
              ["🏅", "Badges e conquistas", "Quando desbloquear novos badges"],
              ["⭐", "Level up", "Ao subir de nível no ranking"],
              ["✍️", "Redação corrigida", "Quando a IA finalizar a análise"],
              ["⚡", "Sprint concluído", "Ao completar uma semana do plano"],
              ["⏰", "Atraso detectado", "Quando o plano ficar para trás"],
              ["📅", "Plano atualizado", "Após regeneração de contingência"],
            ].map(([emoji, title, desc]) => (
              <div key={title} className="flex items-center gap-3 text-sm">
                <span className="text-base shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
