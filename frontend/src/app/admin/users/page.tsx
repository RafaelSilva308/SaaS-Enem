"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Search, ShieldOff, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminUser {
  id: string; name: string; email: string; role: string
  account_status: string; plan_type: string | null
  plan_status: string | null; created_at: string
}
interface UsersResponse {
  items: AdminUser[]; total: number; page: number; per_page: number
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo", suspended: "Suspenso", deleted: "Deletado",
}
const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito", premium_1m: "1 mês", premium_3m: "3 meses",
  premium_6m: "6 meses", premium_trial: "Trial",
}
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "suspended", label: "Suspensos" },
]

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get("/admin/users", {
        params: { page, per_page: 20, search: search || undefined, status: statusFilter || undefined },
      })
      setData(res)
    } catch {
      toast.error("Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const handleStatusToggle = async (user: AdminUser) => {
    const newStatus = user.account_status === "active" ? "suspended" : "active"
    setActionLoading(user.id)
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus })
      toast.success(`Usuário ${newStatus === "active" ? "reativado" : "suspenso"}.`)
      fetchUsers()
    } catch {
      toast.error("Erro ao atualizar status")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Deletar permanentemente ${user.name}? Esta ação não pode ser desfeita.`)) return
    setActionLoading(user.id)
    try {
      await api.delete(`/admin/users/${user.id}`)
      toast.success("Usuário deletado.")
      fetchUsers()
    } catch {
      toast.error("Erro ao deletar usuário")
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {data ? `${data.total.toLocaleString("pt-BR")} usuários cadastrados` : "…"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por nome ou e-mail…"
            className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          />
          <Button variant="outline" size="sm" onClick={handleSearch} className="gap-1.5 shrink-0">
            <Search size={14} />
          </Button>
        </div>
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                statusFilter === opt.value
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <p className="text-center text-sm text-muted-foreground py-16">Nenhum usuário encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Criado em</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.items.map(u => (
                <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight truncate max-w-[180px]">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {u.plan_type ? PLAN_LABELS[u.plan_type] ?? u.plan_type : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-medium",
                      u.account_status === "active" ? "bg-emerald-500/15 text-emerald-400"
                        : u.account_status === "suspended" ? "bg-amber-500/15 text-amber-400"
                          : "bg-red-500/15 text-red-400",
                    )}>
                      {STATUS_LABELS[u.account_status] ?? u.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.account_status !== "deleted" && (
                        <button
                          onClick={() => handleStatusToggle(u)}
                          disabled={actionLoading === u.id}
                          title={u.account_status === "active" ? "Suspender" : "Reativar"}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            u.account_status === "active"
                              ? "text-amber-400 hover:bg-amber-500/10"
                              : "text-emerald-400 hover:bg-emerald-500/10",
                          )}
                        >
                          {actionLoading === u.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : u.account_status === "active"
                              ? <ShieldOff size={14} />
                              : <ShieldCheck size={14} />
                          }
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={actionLoading === u.id}
                        title="Deletar"
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
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
          <span className="text-muted-foreground text-xs">
            Página {page} de {totalPages}
          </span>
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
    </div>
  )
}
