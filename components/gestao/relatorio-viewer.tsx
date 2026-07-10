"use client"

import { brl } from "@/lib/format"
import { FileText, Printer, Users, Wallet, AlertTriangle, Clock } from "lucide-react"
import { useState } from "react"

type AtletaLinha = { nome: string; turma: string | null; categoria: string | null; mensalidade: number; ativo: boolean }
type Mensalidade = { atletaNome: string | null; turmaNome: string | null; competencia: string; valor: number; status: string }
type FreqTurma = { turmaNome: string; presentes: number; total: number; percentual: number }
type Resumo = { recebido: number; pendente: number; totalReg: number; pagos: number }

const relatorios = [
  { key: "atletas", label: "Lista de Atletas", icon: Users },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "atraso", label: "Mensalidades em Atraso", icon: AlertTriangle },
  { key: "frequencia", label: "Frequência por Turma", icon: Clock },
] as const

type RelKey = (typeof relatorios)[number]["key"]

export function RelatorioViewer({
  atletas,
  mensalidades,
  emAtraso,
  freqTurma,
  resumo,
}: {
  atletas: AtletaLinha[]
  mensalidades: Mensalidade[]
  emAtraso: Mensalidade[]
  freqTurma: FreqTurma[]
  resumo: Resumo
}) {
  const [ativo, setAtivo] = useState<RelKey>("atletas")

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
                on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-secondary"
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
        <header className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">
              {relatorios.find((r) => r.key === ativo)?.label} — Voley Tech
            </h2>
            <p className="text-xs text-muted-foreground">
              Emitido em {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
        </header>

        {ativo === "atletas" && <TabelaAtletas rows={atletas} />}
        {ativo === "financeiro" && <TabelaFinanceiro rows={mensalidades} resumo={resumo} />}
        {ativo === "atraso" && <TabelaAtraso rows={emAtraso} />}
        {ativo === "frequencia" && <TabelaFrequencia rows={freqTurma} />}
      </section>
    </div>
  )
}

function Vazio({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{msg}</p>
}

function TabelaAtletas({ rows }: { rows: AtletaLinha[] }) {
  if (rows.length === 0) return <Vazio msg="Nenhum atleta cadastrado." />
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase text-muted-foreground">
          <th className="py-2 pr-4">Nome</th><th className="py-2 pr-4">Turma</th><th className="py-2 pr-4">Categoria</th><th className="py-2 pr-4">Mensalidade</th><th className="py-2">Situação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((a, i) => (
          <tr key={i}>
            <td className="py-2 pr-4 font-medium">{a.nome}</td>
            <td className="py-2 pr-4 text-muted-foreground">{a.turma ?? "—"}</td>
            <td className="py-2 pr-4 text-muted-foreground">{a.categoria ?? "—"}</td>
            <td className="py-2 pr-4">{brl(a.mensalidade)}</td>
            <td className="py-2">{a.ativo ? "Ativo" : "Inativo"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaFinanceiro({ rows, resumo }: { rows: Mensalidade[]; resumo: Resumo }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-secondary p-3"><span className="text-muted-foreground">Recebido</span><p className="font-bold text-success">{brl(resumo.recebido)}</p></div>
        <div className="rounded-lg bg-secondary p-3"><span className="text-muted-foreground">Pendente</span><p className="font-bold text-warning">{brl(resumo.pendente)}</p></div>
        <div className="rounded-lg bg-secondary p-3"><span className="text-muted-foreground">Pagos</span><p className="font-bold">{resumo.pagos}/{resumo.totalReg}</p></div>
      </div>
      {rows.length === 0 ? <Vazio msg="Nenhuma mensalidade." /> : (
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="py-2 pr-4">Atleta</th><th className="py-2 pr-4">Competência</th><th className="py-2 pr-4">Valor</th><th className="py-2">Situação</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((m, i) => (
              <tr key={i}><td className="py-2 pr-4 font-medium">{m.atletaNome ?? "—"}</td><td className="py-2 pr-4 text-muted-foreground">{m.competencia}</td><td className="py-2 pr-4">{brl(m.valor)}</td><td className="py-2">{m.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function TabelaAtraso({ rows }: { rows: Mensalidade[] }) {
  if (rows.length === 0) return <Vazio msg="Nenhuma mensalidade em atraso. Parabéns!" />
  return (
    <table className="w-full text-left text-sm">
      <thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="py-2 pr-4">Atleta</th><th className="py-2 pr-4">Turma</th><th className="py-2 pr-4">Competência</th><th className="py-2">Valor</th></tr></thead>
      <tbody className="divide-y divide-border">
        {rows.map((m, i) => (
          <tr key={i}><td className="py-2 pr-4 font-medium">{m.atletaNome ?? "—"}</td><td className="py-2 pr-4 text-muted-foreground">{m.turmaNome ?? "—"}</td><td className="py-2 pr-4 text-muted-foreground">{m.competencia}</td><td className="py-2 font-semibold text-destructive">{brl(m.valor)}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaFrequencia({ rows }: { rows: FreqTurma[] }) {
  if (rows.every((r) => r.total === 0)) return <Vazio msg="Sem chamadas registradas." />
  return (
    <table className="w-full text-left text-sm">
      <thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="py-2 pr-4">Turma</th><th className="py-2 pr-4">Presenças</th><th className="py-2">Frequência</th></tr></thead>
      <tbody className="divide-y divide-border">
        {rows.map((t, i) => (
          <tr key={i}><td className="py-2 pr-4 font-medium">{t.turmaNome}</td><td className="py-2 pr-4 text-muted-foreground">{t.presentes}/{t.total}</td><td className="py-2 font-semibold">{t.percentual}%</td></tr>
        ))}
      </tbody>
    </table>
  )
}
