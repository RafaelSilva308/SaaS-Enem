"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Users, Lock, Crown, Bell, ShieldCheck, Download, Trash2, Loader2, Edit, Check, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

type Section = "perfil" | "conta" | "assinatura" | "notif" | "priv"

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "perfil",      label: "Perfil",        icon: Users },
  { id: "conta",       label: "Conta",         icon: Lock },
  { id: "assinatura",  label: "Assinatura",    icon: Crown },
  { id: "notif",       label: "Notificações",  icon: Bell },
  { id: "priv",        label: "Privacidade",   icon: ShieldCheck },
]

const NOTIF_ITEMS = [
  { id: "push",        label: "Push notifications",                  desc: "Receber alertas no dispositivo (PWA)" },
  { id: "email",       label: "Emails resumo",                       desc: "Resumo semanal de progresso, sempre aos domingos" },
  { id: "plano",       label: "Lembretes do plano de estudos",       desc: "30 min antes de cada sessão" },
  { id: "conquistas",  label: "Conquistas e XP",                     desc: "Quando desbloquear uma medalha ou subir de nível" },
  { id: "ranking",     label: "Mudanças no ranking",                  desc: "Quando subir ou descer 3+ posições" },
  { id: "marketing",   label: "Novidades e promoções",               desc: "Atualizações do produto e ofertas" },
]

function SwitchToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ width: 38, height: 22, borderRadius: 999, background: on ? "var(--primary)" : "rgba(30,41,59,0.8)", border: `1px solid ${on ? "var(--primary)" : "var(--border-strong)"}`, position: "relative", cursor: "pointer", transition: "all 200ms", flexShrink: 0, boxShadow: on ? "0 0 12px rgba(37,99,235,0.4)" : "none" }}>
      <div style={{ position: "absolute", top: 1.5, left: on ? 17 : 2, width: 16, height: 16, borderRadius: 999, background: "#fff", transition: "left 220ms cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
    </button>
  )
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [section, setSection] = useState<Section>("perfil")
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ push: true, email: true, plano: true, conquistas: true, ranking: false, marketing: false })
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [twoFA, setTwoFA] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: "", new: "", confirm: "" })
  const [changingPwd, setChangingPwd] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get("/auth/me/export", { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }))
      const a = document.createElement("a"); a.href = url; a.download = "meus-dados-enem-pro.json"
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      toast.success("Dados exportados com sucesso!")
    } catch { toast.error("Erro ao exportar dados") }
    finally { setExporting(false) }
  }

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) { toast.error("E-mail não confere."); return }
    setDeleting(true)
    try {
      await api.delete("/auth/me"); clearAuth(); router.replace("/")
    } catch { toast.error("Erro ao excluir conta") }
    finally { setDeleting(false) }
  }

  return (
    <div className="page-scroll">
      <div className="page-inner stagger">
        <div className="page-header">
          <div className="col">
            <div className="breadcrumb">Conta → Configurações</div>
            <h1 className="page-title">Configurações</h1>
          </div>
        </div>

        <div className="grid-sidebar">
          {/* Sidebar nav */}
          <div className="col" style={{ gap: 4 }}>
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const active = section === s.id
              return (
                <button key={s.id} onClick={() => setSection(s.id)} className="row" style={{ gap: 10, padding: "10px 14px", borderRadius: 10, background: active ? "rgba(37,99,235,0.1)" : "transparent", border: `1px solid ${active ? "rgba(37,99,235,0.25)" : "transparent"}`, color: active ? "#bfdbfe" : "var(--muted-foreground)", cursor: "pointer", fontSize: 13.5, fontWeight: 500, fontFamily: "'Outfit', system-ui", transition: "all 180ms" }}>
                  <Icon size={15} /> {s.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="col" style={{ gap: 16 }}>
            {/* ── Perfil ── */}
            {section === "perfil" && (
              <>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 16 }}>Informações pessoais</h3>
                  <div className="row" style={{ gap: 20, alignItems: "center", marginBottom: 24 }}>
                    <div style={{ position: "relative" }}>
                      <div className="avatar" style={{ width: 72, height: 72, fontSize: 24 }}>
                        {user?.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() ?? "EP"}
                      </div>
                      <button className="btn btn-icon" style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, background: "var(--background)" }}><Edit size={12} /></button>
                    </div>
                    <div className="col" style={{ flex: 1, gap: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Foto de perfil</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>PNG ou JPG · até 2MB</div>
                    </div>
                    <button className="btn btn-secondary btn-sm">Trocar</button>
                  </div>
                  <div className="grid-2" style={{ gap: 14 }}>
                    {[
                      { label: "Nome completo", value: user?.name ?? "" },
                      { label: "Email", value: user?.email ?? "" },
                      { label: "Ano escolar", value: "3º Ensino Médio" },
                      { label: "Data do ENEM", value: "2 de novembro de 2026" },
                    ].map((f) => (
                      <div key={f.label} className="col" style={{ gap: 6 }}>
                        <label style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{f.label}</label>
                        <input className="input" defaultValue={f.value} />
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 20 }}>
                    <button className="btn btn-primary">Salvar alterações</button>
                    <button className="btn btn-ghost">Cancelar</button>
                  </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 14 }}>Matérias com dificuldade</h3>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {["Probabilidade", "Termodinâmica", "Sintaxe", "Geometria Analítica", "Química Orgânica", "Geopolítica"].map((c, i) => {
                      const active = i < 4
                      return <button key={c} className={`chip ${active ? "chip-active" : ""}`}>{active && <Check size={11} />} {c}</button>
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── Conta ── */}
            {section === "conta" && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 16 }}>Segurança</h3>
                <div className="col" style={{ gap: 16 }}>
                  {([
                    { label: "Senha atual",        key: "current", placeholder: "••••••••••" },
                    { label: "Nova senha",          key: "new",     placeholder: "Mín. 8 caracteres, 1 maiúscula, 1 número" },
                    { label: "Confirmar nova senha", key: "confirm", placeholder: "" },
                  ] as const).map((f) => (
                    <div key={f.key} className="col" style={{ gap: 6 }}>
                      <label style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{f.label}</label>
                      <input
                        className="input"
                        type="password"
                        placeholder={f.placeholder}
                        value={pwdForm[f.key]}
                        onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="row between" style={{ padding: 14, background: "rgba(15,23,42,0.4)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div className="col" style={{ lineHeight: 1.3 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>Autenticação em 2 fatores</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Adicione uma camada extra de segurança ao seu login</div>
                    </div>
                    <SwitchToggle on={twoFA} onToggle={() => setTwoFA(v => !v)} />
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      disabled={changingPwd}
                      onClick={async () => {
                        if (!pwdForm.current || !pwdForm.new || !pwdForm.confirm) {
                          toast.error("Preencha todos os campos"); return
                        }
                        if (pwdForm.new !== pwdForm.confirm) {
                          toast.error("As senhas não coincidem"); return
                        }
                        setChangingPwd(true)
                        try {
                          await api.post("/auth/change-password", {
                            current_password: pwdForm.current,
                            new_password: pwdForm.new,
                          })
                          toast.success("Senha atualizada com sucesso!")
                          setPwdForm({ current: "", new: "", confirm: "" })
                        } catch (err: any) {
                          toast.error(err.response?.data?.detail ?? "Erro ao atualizar senha")
                        } finally {
                          setChangingPwd(false)
                        }
                      }}
                    >
                      {changingPwd ? <Loader2 size={14} className="animate-spin" /> : "Atualizar senha"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setPwdForm({ current: "", new: "", confirm: "" })}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Assinatura ── */}
            {section === "assinatura" && (
              <>
                <div className="card card-premium" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 100% 0%, rgba(124,58,237,0.18), transparent 60%)" }} />
                  <div className="row between" style={{ position: "relative" }}>
                    <div className="col" style={{ gap: 6 }}>
                      <span className="badge badge-premium" style={{ alignSelf: "flex-start" }}>✦ Plano atual</span>
                      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em" }}>ENEM Pro <span className="text-gradient-brand">Premium</span></div>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Trial · 7 dias gratuitos</div>
                    </div>
                    <div className="col" style={{ gap: 8 }}>
                      <Link href="/configuracoes/billing">
                        <button className="btn btn-secondary btn-sm">Gerenciar pagamento</button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid-3" style={{ gap: 12 }}>
                  {[
                    { name: "Gratuito", price: "R$ 0", suffix: "/mês", features: ["50 questões/mês", "1 redação/mês", "Plano básico"], current: false },
                    { name: "Pro Mensal", price: "R$ 59,90", suffix: "/mês", features: ["Questões ilimitadas", "Redações ilimitadas", "Análise IA", "Simulados completos"], current: false },
                    { name: "Pro Semestral", price: "R$ 149,90", suffix: "/6m", features: ["Tudo do Pro Mensal", "Melhor custo-benefício", "Mentoria IA dedicada"], current: true, badge: "Atual" },
                  ].map((p, i) => (
                    <div key={i} className="card" style={{ padding: 20, border: `1px solid ${p.current ? "rgba(37,99,235,0.5)" : "var(--border)"}`, boxShadow: p.current ? "0 0 24px rgba(37,99,235,0.18)" : "none", position: "relative" }}>
                      {p.badge && <span className="badge badge-primary" style={{ position: "absolute", top: 12, right: 12 }}>{p.badge}</span>}
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                      <div className="row" style={{ alignItems: "baseline", gap: 4, margin: "12px 0" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>{p.price}</div>
                        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{p.suffix}</div>
                      </div>
                      <div className="col" style={{ gap: 8, marginBottom: 14 }}>
                        {p.features.map((f, j) => (
                          <div key={j} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                            <Check size={13} color="#34d399" /> <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {p.current ? (
                        <button className="btn btn-secondary" style={{ width: "100%" }} disabled>Plano atual</button>
                      ) : (
                        <Link href="/configuracoes/billing">
                          <button className="btn btn-brand" style={{ width: "100%" }}>Mudar para este</button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Notificações ── */}
            {section === "notif" && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 8 }}>Notificações</h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>Escolha como e quando quer ser avisado.</div>
                <div className="col" style={{ gap: 4 }}>
                  {NOTIF_ITEMS.map((n, i) => (
                    <div key={n.id} className="row" style={{ gap: 12, padding: "14px 0", borderBottom: i < NOTIF_ITEMS.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div className="col" style={{ flex: 1, lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{n.label}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{n.desc}</div>
                      </div>
                      <SwitchToggle on={notifs[n.id] ?? false} onToggle={() => setNotifs(prev => ({ ...prev, [n.id]: !prev[n.id] }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Privacidade ── */}
            {section === "priv" && (
              <>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 16 }}>Seus dados</h3>
                  <div className="row between" style={{ padding: 14, background: "rgba(15,23,42,0.4)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div className="col" style={{ lineHeight: 1.3 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>Exportar meus dados</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Baixe um arquivo .json com todos os seus dados (LGPD)</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
                      {exporting ? <span className="spinner" /> : <Download size={12} />}
                      Exportar
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: 24, border: "1px solid rgba(239,68,68,0.3)" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 6, color: "#fca5a5" }}>Zona de perigo</h3>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>Estas ações são permanentes e não podem ser desfeitas.</div>
                  {!showDeleteConfirm ? (
                    <div className="row between" style={{ padding: 14, background: "rgba(239,68,68,0.05)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="col" style={{ lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: "#fca5a5" }}>Excluir minha conta</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Todos os dados serão apagados permanentemente</div>
                      </div>
                      <button className="btn btn-destructive btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 size={12} /> Excluir conta
                      </button>
                    </div>
                  ) : (
                    <div className="col" style={{ gap: 12 }}>
                      <div className="row" style={{ gap: 8, padding: 12, background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5" }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                        Para confirmar, digite seu e-mail: <strong>{user?.email}</strong>
                      </div>
                      <input className="input" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="seu@email.com" style={{ borderColor: "rgba(239,68,68,0.3)" }} />
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowDeleteConfirm(false); setConfirmEmail("") }}>Cancelar</button>
                        <button className="btn btn-destructive" style={{ flex: 1 }} onClick={handleDeleteAccount} disabled={deleting || confirmEmail !== user?.email}>
                          {deleting ? <span className="spinner" /> : <Trash2 size={13} />}
                          {deleting ? "Excluindo…" : "Excluir definitivamente"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="row" style={{ gap: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
                  <Link href="/privacidade" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>Política de Privacidade</Link>
                  <Link href="/termos" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>Termos de Uso</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
