"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { calcularMensalidade, brl, type DescontoTipo } from "@/lib/gestao/format"
import { Save, Loader2, GraduationCap, Plus, X } from "lucide-react"

export type TurmaOption = {
  id: number
  nome: string
  categoriaId: number | null
  valorMensalidade: string
  diaVencimento: number
}
export type CategoriaOption = { id: number; nome: string }

export type VinculoInicial = { turmaId: number; valor: number }

export type AtletaInitial = {
  id?: number
  nome?: string
  cpf?: string | null
  telefone?: string | null
  email?: string | null
  dataNascimento?: string | null
  dataInscricao?: string | null
  responsavel?: string | null
  telefoneResponsavel?: string | null
  categoriaId?: number | null
  turmaId?: number | null
  vinculos?: VinculoInicial[]
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

  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoriaId ? String(initial.categoriaId) : "")
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>(initial?.descontoTipo ?? "nenhum")
  const [descontoValor, setDescontoValor] = useState<string>(initial?.descontoValor ?? "0")

  // Lista de turmas do atleta (cada uma com seu valor). Um atleta pode ter várias.
  const [vinculos, setVinculos] = useState<VinculoInicial[]>(
    initial?.vinculos && initial.vinculos.length > 0 ? initial.vinculos : [],
  )
  const [novaTurma, setNovaTurma] = useState<string>("")

  // Valor base = soma das turmas. O desconto é aplicado sobre esse total.
  const valorBase = useMemo(() => vinculos.reduce((s, v) => s + (Number(v.valor) || 0), 0), [vinculos])
  const calc = useMemo(
    () => calcularMensalidade(valorBase, descontoTipo, Number(descontoValor) || 0),
    [valorBase, descontoTipo, descontoValor],
  )

  function adicionarTurma() {
    const t = turmas.find((x) => String(x.id) === novaTurma)
    if (!t) return
    if (vinculos.some((v) => v.turmaId === t.id)) return
    setVinculos((prev) => [...prev, { turmaId: t.id, valor: Number(t.valorMensalidade) || 0 }])
    if (t.categoriaId && !categoriaId) setCategoriaId(String(t.categoriaId))
    setNovaTurma("")
  }

  function removerTurma(turmaId: number) {
    setVinculos((prev) => prev.filter((v) => v.turmaId !== turmaId))
  }

  function alterarValorTurma(turmaId: number, valor: string) {
    setVinculos((prev) => prev.map((v) => (v.turmaId === turmaId ? { ...v, valor: Number(valor) || 0 } : v)))
  }

  const turmasDisponiveis = turmas.filter((t) => !vinculos.some((v) => v.turmaId === t.id))
  const nomeTurma = (id: number) => turmas.find((t) => t.id === id)?.nome ?? `Turma ${id}`

  function handleSubmit(formData: FormData) {
    setError(null)
    if (vinculos.length === 0) {
      setError("Adicione ao menos uma turma para o atleta.")
      return
    }
    formData.set("turmasJson", JSON.stringify(vinculos))
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
            <label className={labelCls} htmlFor="dataInscricao">Data de inscrição *</label>
            <input
              id="dataInscricao"
              name="dataInscricao"
              type="date"
              required
              defaultValue={initial?.dataInscricao ?? new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Base para o controle e vencimento das mensalidades.</p>
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
        <h2 className="mb-1 text-base font-bold">Turmas do atleta</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Um atleta pode participar de várias turmas. Cada turma tem seu próprio valor e gera uma
          mensalidade separada por mês.
        </p>

        {/* Turmas já adicionadas */}
        {vinculos.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {vinculos.map((v) => (
              <li key={v.turmaId} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{nomeTurma(v.turmaId)}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.valor}
                    onChange={(e) => alterarValorTurma(v.turmaId, e.target.value)}
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    aria-label={`Valor da turma ${nomeTurma(v.turmaId)}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removerTurma(v.turmaId)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Remover turma ${nomeTurma(v.turmaId)}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Nenhuma turma adicionada ainda.
          </p>
        )}

        {/* Adicionar turma */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className={labelCls} htmlFor="novaTurma">Adicionar turma</label>
            <select
              id="novaTurma"
              value={novaTurma}
              onChange={(e) => setNovaTurma(e.target.value)}
              className={inputCls}
              disabled={turmasDisponiveis.length === 0}
            >
              <option value="">{turmasDisponiveis.length === 0 ? "Todas as turmas já adicionadas" : "Selecione uma turma"}</option>
              {turmasDisponiveis.map((t) => (
                <option key={t.id} value={t.id}>{t.nome} — {brl(t.valorMensalidade)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={adicionarTurma}
            disabled={!novaTurma}
            className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>

        <div className="mt-4">
          <label className={labelCls} htmlFor="categoriaId">Categoria</label>
          <select id="categoriaId" name="categoriaId" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
          <GraduationCap className="h-4 w-4 text-primary" /> Mensalidade e bolsa
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          O valor base é a soma das turmas do atleta. A bolsa (percentual ou valor fixo) é aplicada
          sobre o total e distribuída proporcionalmente entre as mensalidades de cada turma.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Valor base (soma das turmas)</label>
            <div className="flex h-[42px] items-center rounded-lg border border-border bg-secondary/40 px-3 text-sm font-semibold">
              {brl(valorBase)}
            </div>
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
