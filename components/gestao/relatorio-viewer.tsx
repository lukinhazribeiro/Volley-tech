"use client"

import { brl, competenciaLabel, formatDate } from "@/lib/gestao/format"
import {
  Printer,
  Users,
  AlertTriangle,
  Clock,
  Landmark,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Trash2,
} from "lucide-react"
import { useState, useTransition } from "react"
import { gradeFrequenciaMensal } from "@/app/gestao/actions/frequencia"
import { balancoAnual } from "@/app/gestao/actions/financeiro"
import { listDespesas, createDespesa, deleteDespesa } from "@/app/gestao/actions/despesas"

/* ---------- Tipos ---------- */
type AtletaLinha = {
  nome: string
  turmaNome: string | null
  categoriaNome: string | null
  dataNascimento: string | null
  dataInscricao: string | null
  mensalidade: number
  ativo: boolean
}
type Mensalidade = {
  atletaNome: string | null
  turmaNome: string | null
  competencia: string
  valor: number
  status: string
  dataVencimento: string | null
}
type Celula = "P" | "A" | "F"
type GradeAtleta = {
  nome: string
  celulas: Record<string, Celula>
  presentes: number
  total: number
  percentual: number
}
type GradeBloco = {
  turmaId: number
  turmaNome: string
  datas: string[]
  totalAulas: number
  atletas: GradeAtleta[]
}
type Balanco = {
  ano: number
  meses: { mes: number; receita: number; despesa: number; resultado: number }[]
  totalReceita: number
  totalDespesa: number
  resultado: number
  receitaPorTurma: { turmaNome: string; total: number }[]
  despesaPorCategoria: { categoria: string; total: number }[]
}
type Despesa = {
  id: number
  descricao: string
  categoria: string
  valor: number
  data: string
  observacao: string | null
}

const relatorios = [
  { key: "atletas", label: "Lista de Atletas", icon: Users },
  { key: "frequencia", label: "Frequência por Turma", icon: Clock },
  { key: "balanco", label: "Balanço Anual (IR)", icon: Landmark },
  { key: "atraso", label: "Mensalidades em Atraso", icon: AlertTriangle },
] as const
type RelKey = (typeof relatorios)[number]["key"]

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function anoDeNascimento(d: string | null): string {
  if (!d) return "Sem data"
  return d.slice(0, 4)
}
function diaDaData(d: string): string {
  // "YYYY-MM-DD" -> "DD"
  return d.slice(8, 10)
}

export function RelatorioViewer({
  atletas,
  emAtraso,
  competencias,
  anos,
  compInicial,
  anoInicial,
  gradeInicial,
  balancoInicial,
  despesasInicial,
}: {
  atletas: AtletaLinha[]
  emAtraso: Mensalidade[]
  competencias: string[]
  anos: number[]
  compInicial: string
  anoInicial: number
  gradeInicial: GradeBloco[]
  balancoInicial: Balanco
  despesasInicial: Despesa[]
}) {
  const [ativo, setAtivo] = useState<RelKey>("atletas")
  const [competencia, setCompetencia] = useState(compInicial)
  const [ano, setAno] = useState(anoInicial)
  const [grade, setGrade] = useState(gradeInicial)
  const [balanco, setBalanco] = useState(balancoInicial)
  const [despesas, setDespesas] = useState(despesasInicial)
  const [pending, startTransition] = useTransition()

  const titulo = relatorios.find((r) => r.key === ativo)?.label

  function trocarMes(comp: string) {
    setCompetencia(comp)
    startTransition(async () => setGrade(await gradeFrequenciaMensal(comp)))
  }
  function trocarAno(a: number) {
    setAno(a)
    startTransition(async () => {
      const [b, d] = await Promise.all([balancoAnual(a), listDespesas(a)])
      setBalanco(b)
      setDespesas(d)
    })
  }
  function recarregarBalanco() {
    startTransition(async () => {
      const [b, d] = await Promise.all([balancoAnual(ano), listDespesas(ano)])
      setBalanco(b)
      setDespesas(d)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2 print:hidden">
        {relatorios.map((r) => {
          const Icon = r.icon
          const on = ativo === r.key
          return (
            <button
              key={r.key}
              onClick={() => setAtivo(r.key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {r.label}
            </button>
          )
        })}
        <button
          onClick={() => window.print()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.02]"
        >
          <Printer className="h-4 w-4" /> Exportar em PDF
        </button>
      </aside>

      <section className="rounded-2xl border border-border bg-card p-6 print:border-0">
        {/* Cabeçalho com a logo — visível também no PDF impresso */}
        <header className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/volley-tech-logo.png"
              alt="Volley Tech"
              className="h-11 w-11 shrink-0 object-contain"
              draggable={false}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Volley Tech</p>
              <h2 className="text-lg font-bold leading-tight">{titulo}</h2>
              <p className="text-xs text-muted-foreground">
                Emitido em {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground print:block">
            <p className="font-semibold text-foreground">Volley Tech · Gestão de Clube</p>
          </div>
        </header>

        {/* Seletores contextuais */}
        {ativo === "frequencia" && (
          <div className="mb-4 flex items-center gap-2 print:hidden">
            <label className="text-sm font-medium text-muted-foreground">Mês de referência:</label>
            <select
              value={competencia}
              onChange={(e) => trocarMes(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              {competencias.length === 0 && <option value={competencia}>{competenciaLabel(competencia)}</option>}
              {competencias.map((c) => (
                <option key={c} value={c}>
                  {competenciaLabel(c)}
                </option>
              ))}
            </select>
            {pending && <span className="text-xs text-muted-foreground">Atualizando…</span>}
          </div>
        )}
        {ativo === "balanco" && (
          <div className="mb-4 flex items-center gap-2 print:hidden">
            <label className="text-sm font-medium text-muted-foreground">Ano-calendário:</label>
            <select
              value={ano}
              onChange={(e) => trocarAno(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            {pending && <span className="text-xs text-muted-foreground">Atualizando…</span>}
          </div>
        )}

        {ativo === "atletas" && <RelAtletas rows={atletas} />}
        {ativo === "frequencia" && <RelFrequencia blocos={grade} competencia={competencia} />}
        {ativo === "balanco" && (
          <RelBalanco
            balanco={balanco}
            despesas={despesas}
            onChange={recarregarBalanco}
            pending={pending}
          />
        )}
        {ativo === "atraso" && <RelAtraso rows={emAtraso} />}
      </section>
    </div>
  )
}

function Vazio({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{msg}</p>
}

/* ---------- Lista de Atletas (por turma / por ano de nascimento) ---------- */
function RelAtletas({ rows }: { rows: AtletaLinha[] }) {
  const [modo, setModo] = useState<"turma" | "ano">("turma")
  if (rows.length === 0) return <Vazio msg="Nenhum atleta cadastrado." />

  const grupos = new Map<string, AtletaLinha[]>()
  for (const a of rows) {
    const chave = modo === "turma" ? a.turmaNome ?? "Sem turma" : anoDeNascimento(a.dataNascimento)
    const arr = grupos.get(chave) ?? []
    arr.push(a)
    grupos.set(chave, arr)
  }
  const chaves = Array.from(grupos.keys()).sort((a, b) =>
    modo === "ano" ? b.localeCompare(a) : a.localeCompare(b),
  )

  return (
    <>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-secondary p-1 print:hidden">
        {(["turma", "ano"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "turma" ? "Por Turma" : "Por Ano de Nascimento"}
          </button>
        ))}
      </div>
      <p className="mb-4 hidden text-sm font-medium text-muted-foreground print:block">
        Agrupamento: {modo === "turma" ? "por turma" : "por ano de nascimento"}
      </p>

      <div className="space-y-6">
        {chaves.map((chave) => {
          const lista = grupos.get(chave)!
          return (
            <div key={chave} className="break-inside-avoid rounded-xl border border-border">
              <div className="flex items-center justify-between rounded-t-xl bg-secondary px-4 py-2.5">
                <h3 className="text-sm font-bold">
                  {modo === "turma" ? chave : `Nascidos em ${chave}`}
                </h3>
                <span className="text-xs font-medium text-muted-foreground">
                  {lista.length} atleta{lista.length !== 1 ? "s" : ""}
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2">Nome</th>
                    <th className="px-4 py-2">{modo === "turma" ? "Nascimento" : "Turma"}</th>
                    <th className="px-4 py-2">Categoria</th>
                    <th className="px-4 py-2">Mensalidade</th>
                    <th className="px-4 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((a, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">{a.nome}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {modo === "turma" ? formatDate(a.dataNascimento) : a.turmaNome ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{a.categoriaNome ?? "—"}</td>
                      <td className="px-4 py-2">{brl(a.mensalidade)}</td>
                      <td className="px-4 py-2">{a.ativo ? "Ativo" : "Inativo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ---------- Frequência mensal por turma (grade atleta × datas) ---------- */
function RelFrequencia({ blocos, competencia }: { blocos: GradeBloco[]; competencia: string }) {
  if (blocos.length === 0 || blocos.every((b) => b.totalAulas === 0))
    return <Vazio msg="Sem chamadas registradas neste mês." />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-foreground">Legenda:</span>
        <span className="inline-flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-success/15 text-[10px] font-bold text-success">P</span> Presente
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-warning/15 text-[10px] font-bold text-warning">A</span> Atrasado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-destructive/15 text-[10px] font-bold text-destructive">F</span> Falta
        </span>
      </div>

      {blocos.map((b) => (
        <div key={b.turmaId} className="break-inside-avoid rounded-xl border border-border">
          <div className="flex items-center justify-between rounded-t-xl bg-secondary px-4 py-2.5">
            <h3 className="text-sm font-bold">{b.turmaNome}</h3>
            <span className="text-xs font-medium text-muted-foreground">
              {competenciaLabel(competencia)} · {b.totalAulas} aula{b.totalAulas !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border uppercase text-muted-foreground">
                  <th className="sticky left-0 bg-card px-3 py-2 text-left">Atleta</th>
                  {b.datas.map((d) => (
                    <th key={d} className="px-1.5 py-2 text-center font-semibold" title={formatDate(d)}>
                      {diaDaData(d)}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">Pres.</th>
                  <th className="px-2 py-2 text-center">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {b.atletas.map((a, i) => (
                  <tr key={i}>
                    <td className="sticky left-0 bg-card px-3 py-1.5 font-medium">{a.nome}</td>
                    {b.datas.map((d) => {
                      const c = a.celulas[d]
                      const cor =
                        c === "P"
                          ? "text-success"
                          : c === "A"
                            ? "text-warning"
                            : c === "F"
                              ? "text-destructive"
                              : "text-muted-foreground/40"
                      return (
                        <td key={d} className={`px-1.5 py-1.5 text-center font-bold ${cor}`}>
                          {c ?? "·"}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-center text-muted-foreground">
                      {a.presentes}/{a.total}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold">{a.percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Balanço Anual (IR) ---------- */
function RelBalanco({
  balanco,
  despesas,
  onChange,
  pending,
}: {
  balanco: Balanco
  despesas: Despesa[]
  onChange: () => void
  pending: boolean
}) {
  const maxValor = Math.max(1, ...balanco.meses.map((m) => Math.max(m.receita, m.despesa)))

  async function submit(formData: FormData) {
    await createDespesa(formData)
    onChange()
  }
  async function remover(id: number) {
    await deleteDespesa(id)
    onChange()
  }

  return (
    <div className="space-y-6">
      {/* KPIs modernos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Receita total</span>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-success">{brl(balanco.totalReceita)}</p>
          <p className="text-xs text-muted-foreground">Mensalidades recebidas em {balanco.ano}</p>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Despesa total</span>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-bold text-destructive">{brl(balanco.totalDespesa)}</p>
          <p className="text-xs text-muted-foreground">Despesas lançadas em {balanco.ano}</p>
        </div>
        <div
          className={`rounded-2xl border p-5 ${
            balanco.resultado >= 0 ? "border-primary/20 bg-primary/5" : "border-warning/20 bg-warning/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Resultado</span>
            <Scale className={`h-5 w-5 ${balanco.resultado >= 0 ? "text-primary" : "text-warning"}`} />
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${
              balanco.resultado >= 0 ? "text-primary" : "text-warning"
            }`}
          >
            {brl(balanco.resultado)}
          </p>
          <p className="text-xs text-muted-foreground">Receitas − Despesas</p>
        </div>
      </div>

      {/* Demonstrativo mensal */}
      <div className="break-inside-avoid rounded-xl border border-border">
        <div className="rounded-t-xl bg-secondary px-4 py-2.5">
          <h3 className="text-sm font-bold">Demonstrativo mensal · {balanco.ano}</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2">Mês</th>
              <th className="px-4 py-2 text-right">Receitas</th>
              <th className="px-4 py-2 text-right">Despesas</th>
              <th className="px-4 py-2 text-right">Resultado</th>
              <th className="px-4 py-2 print:hidden">Comparativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {balanco.meses.map((m) => (
              <tr key={m.mes}>
                <td className="px-4 py-2 font-medium">{MESES[m.mes - 1]}</td>
                <td className="px-4 py-2 text-right text-success">{brl(m.receita)}</td>
                <td className="px-4 py-2 text-right text-destructive">{brl(m.despesa)}</td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    m.resultado >= 0 ? "text-foreground" : "text-warning"
                  }`}
                >
                  {brl(m.resultado)}
                </td>
                <td className="px-4 py-2 print:hidden">
                  <div className="flex h-4 items-center gap-0.5">
                    <div
                      className="h-2 rounded-full bg-success"
                      style={{ width: `${(m.receita / maxValor) * 100}%` }}
                    />
                    <div
                      className="h-2 rounded-full bg-destructive"
                      style={{ width: `${(m.despesa / maxValor) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/50 font-bold">
              <td className="px-4 py-2.5">TOTAL {balanco.ano}</td>
              <td className="px-4 py-2.5 text-right text-success">{brl(balanco.totalReceita)}</td>
              <td className="px-4 py-2.5 text-right text-destructive">{brl(balanco.totalDespesa)}</td>
              <td
                className={`px-4 py-2.5 text-right ${
                  balanco.resultado >= 0 ? "text-primary" : "text-warning"
                }`}
              >
                {brl(balanco.resultado)}
              </td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detalhamentos */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="break-inside-avoid rounded-xl border border-border">
          <div className="rounded-t-xl bg-secondary px-4 py-2.5">
            <h3 className="text-sm font-bold">Receita por turma</h3>
          </div>
          {balanco.receitaPorTurma.length === 0 ? (
            <Vazio msg="Sem receitas no período." />
          ) : (
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border">
                {balanco.receitaPorTurma.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium">{r.turmaNome}</td>
                    <td className="px-4 py-2 text-right text-success">{brl(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="break-inside-avoid rounded-xl border border-border">
          <div className="rounded-t-xl bg-secondary px-4 py-2.5">
            <h3 className="text-sm font-bold">Despesa por categoria</h3>
          </div>
          {balanco.despesaPorCategoria.length === 0 ? (
            <Vazio msg="Sem despesas no período." />
          ) : (
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border">
                {balanco.despesaPorCategoria.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium capitalize">{r.categoria}</td>
                    <td className="px-4 py-2 text-right text-destructive">{brl(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lançamento de despesas (não aparece no PDF) */}
      <div className="rounded-xl border border-border p-4 print:hidden">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Lançar despesa
        </h3>
        <form action={submit} className="grid gap-3 sm:grid-cols-[1fr_140px_120px_140px_auto]">
          <input
            name="descricao"
            required
            placeholder="Descrição"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="categoria"
            placeholder="Categoria"
            defaultValue="geral"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Valor"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="data"
            type="date"
            required
            defaultValue={`${balanco.ano}-01-01`}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>

        {despesas.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Descrição</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {despesas.map((d) => (
                <tr key={d.id}>
                  <td className="px-2 py-2 text-muted-foreground">{formatDate(d.data)}</td>
                  <td className="px-2 py-2 font-medium">{d.descricao}</td>
                  <td className="px-2 py-2 capitalize text-muted-foreground">{d.categoria}</td>
                  <td className="px-2 py-2 text-right text-destructive">{brl(d.valor)}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => remover(d.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Excluir despesa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ---------- Mensalidades em atraso ---------- */
function RelAtraso({ rows }: { rows: Mensalidade[] }) {
  if (rows.length === 0) return <Vazio msg="Nenhuma mensalidade em atraso. Parabéns!" />
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase text-muted-foreground">
          <th className="py-2 pr-4">Atleta</th>
          <th className="py-2 pr-4">Turma</th>
          <th className="py-2 pr-4">Competência</th>
          <th className="py-2">Valor</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((m, i) => (
          <tr key={i}>
            <td className="py-2 pr-4 font-medium">{m.atletaNome ?? "—"}</td>
            <td className="py-2 pr-4 text-muted-foreground">{m.turmaNome ?? "—"}</td>
            <td className="py-2 pr-4 text-muted-foreground">{competenciaLabel(m.competencia)}</td>
            <td className="py-2 font-semibold text-destructive">{brl(m.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
