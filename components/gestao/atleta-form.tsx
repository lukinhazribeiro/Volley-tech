"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { calcularMensalidade, brl, type DescontoTipo } from "@/lib/gestao/format"
import { Save, Loader2, GraduationCap } from "lucide-react"

export type TurmaOption = {
  id: number
  nome: string
  categoriaId: number | null
  valorMensalidade: string
  diaVencimento: number
}
export type CategoriaOption = { id: number; nome: string }

export type AtletaInitial = {
  id?: number
  nome?: string
  cpf?: string | null
  telefone?: string | null
  email?: string | null
  dataNascimento?: string | null
  responsavel?: string | null
  telefoneResponsavel?: string | null
  categoriaId?: number | null
  turmaId?: number | null
  valorMensalidade?: string
  descontoTipo?: DescontoTipo
  descontoValor?: string
}

const inputCls =
  "w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"

export function AtletaForm({
  turmas,
  categorias,
  initial,
  action,
}: {
  turmas: TurmaOption[]
  categorias: CategoriaOption[]
  initial?: AtletaInitial
  action: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [turmaId, setTurmaId] = useState<string>(initial?.turmaId ? String(initial.turmaId) : "")
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoriaId ? String(initial.categoriaId) : "")
  const [valor, setValor] = useState<string>(initial?.valorMensalidade ?? "0")
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>(initial?.descontoTipo ?? "nenhum")
  const [descontoValor, setDescontoValor] = useState<string>(initial?.descontoValor ?? "0")

  const calc = useMemo(
    () => calcularMensalidade(Number(valor) || 0, descontoTipo, Number(descontoValor) || 0),
    [valor, descontoTipo, descontoValor],
  )

  function onTurmaChange(value: string) {
    setTurmaId(value)
    const t = turmas.find((x) => String(x.id) === value)
    if (t) {
      // Automação: herda o valor base da turma (editável) e a categoria
      setValor(String(Number(t.valorMensalidade)))
      if (t.categoriaId) setCategoriaId(String(t.categoriaId))
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await action(formData)
      } catch (e: any) {
        // redirect() lança NEXT_REDIRECT propositalmente; ignore
        if (e?.digest?.startsWith("NEXT_REDIRECT")) return
        setError(e?.message ?? "Erro ao salvar o atleta.")
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-base font-bold">Dados pessoais</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="nome">Nome completo *</label>
            <input id="nome" name="nome" required defaultValue={initial?.nome ?? ""} className={inputCls} placeholder="Ex.: Ana Clara Souza" />
          </div>
          <div>
            <label className={labelCls} htmlFor="cpf">CPF</label>
            <input id="cpf" name="cpf" defaultValue={initial?.cpf ?? ""} className={inputCls} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className={labelCls} htmlFor="dataNascimento">Data de nascimento</label>
            <input id="dataNascimento" name="dataNascimento" type="date" defaultValue={initial?.dataNascimento ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="telefone">Telefone</label>
            <input id="telefone" name="telefone" defaultValue={initial?.telefone ?? ""} className={inputCls} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className={labelCls} htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} className={inputCls} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className={labelCls} htmlFor="responsavel">Responsável</label>
            <input id="responsavel" name="responsavel" defaultValue={initial?.responsavel ?? ""} className={inputCls} placeholder="Nome do responsável" />
          </div>
          <div>
            <label className={labelCls} htmlFor="telefoneResponsavel">Telefone do responsável</label>
            <input id="telefoneResponsavel" name="telefoneResponsavel" defaultValue={initial?.telefoneResponsavel ?? ""} className={inputCls} placeholder="(00) 00000-0000" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-4 text-base font-bold">Vínculo esportivo</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="turmaId">Turma</label>
            <select id="turmaId" name="turmaId" value={turmaId} onChange={(e) => onTurmaChange(e.target.value)} className={inputCls}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome} — {brl(t.valorMensalidade)}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">Ao escolher a turma, o valor base é preenchido automaticamente.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="categoriaId">Categoria</label>
            <select id="categoriaId" name="categoriaId" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
          <GraduationCap className="h-4 w-4 text-primary" /> Mensalidade e bolsa
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          O valor base é sugerido pela turma, mas pode ser editado. Aplique uma bolsa em percentual ou valor fixo.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="valorMensalidade">Valor base (R$)</label>
            <input id="valorMensalidade" name="valorMensalidade" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="descontoTipo">Tipo de bolsa</label>
            <select id="descontoTipo" name="descontoTipo" value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value as DescontoTipo)} className={inputCls}>
              <option value="nenhum">Sem bolsa</option>
              <option value="percentual">Percentual (%)</option>
              <option value="valor">Valor fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="descontoValor">
              {descontoTipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}
            </label>
            <input
              id="descontoValor"
              name="descontoValor"
              type="number"
              step="0.01"
              min="0"
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
              disabled={descontoTipo === "nenhum"}
              className={inputCls + (descontoTipo === "nenhum" ? " opacity-50" : "")}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl bg-secondary/60 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor base</p>
            <p className="text-sm font-semibold">{brl(calc.base)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Desconto</p>
            <p className="text-sm font-semibold text-destructive">- {brl(calc.desconto)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Mensalidade final</p>
            <p className="text-lg font-extrabold text-primary">{brl(calc.final)}</p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initial?.id ? "Salvar alterações" : "Cadastrar atleta"}
        </button>
      </div>
    </form>
  )
}
