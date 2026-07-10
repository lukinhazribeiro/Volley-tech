"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Save, Loader2 } from "lucide-react"

export type CategoriaOption = { id: number; nome: string }

export type TurmaInitial = {
  id?: number
  nome?: string
  categoriaId?: number | null
  professor?: string | null
  diasSemana?: string | null
  horario?: string | null
  quadra?: string | null
  valorMensalidade?: string
  diaVencimento?: number
}

const inputCls =
  "w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"

export function TurmaForm({
  categorias,
  initial,
  action,
}: {
  categorias: CategoriaOption[]
  initial?: TurmaInitial
  action: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await action(formData)
        router.push("/turmas")
        router.refresh()
      } catch (e: any) {
        setError(e?.message ?? "Erro ao salvar a turma.")
      }
    })
  }

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-base font-bold">Dados da turma</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="nome">Nome da turma *</label>
            <input id="nome" name="nome" required defaultValue={initial?.nome ?? ""} className={inputCls} placeholder="Ex.: Sub 14 Feminino" />
          </div>
          <div>
            <label className={labelCls} htmlFor="categoriaId">Categoria</label>
            <select id="categoriaId" name="categoriaId" defaultValue={initial?.categoriaId ? String(initial.categoriaId) : ""} className={inputCls}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="professor">Professor responsável</label>
            <input id="professor" name="professor" defaultValue={initial?.professor ?? ""} className={inputCls} placeholder="Ex.: Prof. Marina Costa" />
          </div>
          <div>
            <label className={labelCls} htmlFor="diasSemana">Dias da semana</label>
            <input id="diasSemana" name="diasSemana" defaultValue={initial?.diasSemana ?? ""} className={inputCls} placeholder="Ex.: Seg, Qua, Sex" />
          </div>
          <div>
            <label className={labelCls} htmlFor="horario">Horário</label>
            <input id="horario" name="horario" defaultValue={initial?.horario ?? ""} className={inputCls} placeholder="Ex.: 18:00 - 19:30" />
          </div>
          <div>
            <label className={labelCls} htmlFor="quadra">Quadra / Local</label>
            <input id="quadra" name="quadra" defaultValue={initial?.quadra ?? ""} className={inputCls} placeholder="Ex.: Quadra 1" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-base font-bold">Financeiro</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="valorMensalidade">Valor da mensalidade (R$)</label>
            <input id="valorMensalidade" name="valorMensalidade" type="number" step="0.01" min="0" defaultValue={initial?.valorMensalidade ?? "0"} className={inputCls} />
            <p className="mt-1 text-[11px] text-muted-foreground">Sugerido ao vincular atletas — pode ser ajustado por atleta (bolsas).</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="diaVencimento">Dia de vencimento</label>
            <input id="diaVencimento" name="diaVencimento" type="number" min="1" max="28" defaultValue={initial?.diaVencimento ?? 10} className={inputCls} />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initial?.id ? "Salvar alterações" : "Criar turma"}
        </button>
      </div>
    </form>
  )
}
