"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Check, X, Power, PowerOff, Loader2, Layers } from "lucide-react"
import { createCategoria, updateCategoria, toggleCategoria, deleteCategoria } from "@/app/gestao/actions/categorias"

type Categoria = {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  totalAtletas: number
}

const inputCls =
  "w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

export function CategoriasManager({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  function run(fn: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        setEditing(null)
        router.refresh()
      } catch (e: any) {
        setError(e?.message ?? "Ocorreu um erro.")
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      {/* Nova categoria */}
      <form
        action={(fd) => run(() => createCategoria(fd))}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="nome">Nova categoria</label>
          <input id="nome" name="nome" required placeholder="Ex.: Sub 12" className={inputCls} />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="descricao">Descrição</label>
          <input id="descricao" name="descricao" placeholder="Opcional" className={inputCls} />
        </div>
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/20">
        {categorias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Layers className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                {editing === c.id ? (
                  <form action={(fd) => run(() => updateCategoria(c.id, fd))} className="flex flex-1 flex-wrap items-center gap-2">
                    <input name="nome" defaultValue={c.nome} required className={inputCls + " sm:max-w-[180px]"} />
                    <input name="descricao" defaultValue={c.descricao ?? ""} placeholder="Descrição" className={inputCls + " flex-1"} />
                    <button type="submit" disabled={pending} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-label="Salvar">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground" aria-label="Cancelar">
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.descricao ?? "Sem descrição"} · {c.totalAtletas} atletas</p>
                    </div>
                    {c.ativo ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">Ativa</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Inativa</span>
                    )}
                    <button onClick={() => setEditing(c.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Editar" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => run(() => toggleCategoria(c.id, !c.ativo))} disabled={pending} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50" aria-label={c.ativo ? "Inativar" : "Reativar"} title={c.ativo ? "Inativar" : "Reativar"}>
                      {c.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button onClick={() => run(() => deleteCategoria(c.id))} disabled={pending} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive disabled:opacity-50" aria-label="Excluir" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
