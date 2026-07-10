import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil, Phone, Mail, IdCard, CalendarDays, GraduationCap } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { Panel } from "@/components/gestao/panel"
import { getAtleta, getHistoricoAtleta } from "@/app/actions/atletas"
import { brl, initials, formatDate, competenciaLabel, bolsaBadge, labelDesconto, calcularMensalidade } from "@/lib/format"
import type { DescontoTipo } from "@/lib/format"

export const dynamic = "force-dynamic"

const statusChamada: Record<string, { label: string; cls: string }> = {
  presente: { label: "Presente", cls: "bg-success/15 text-success" },
  atrasado: { label: "Atrasado", cls: "bg-warning/15 text-warning" },
  ausente: { label: "Ausente", cls: "bg-destructive/15 text-destructive" },
  justificada: { label: "Justificada", cls: "bg-info/15 text-info" },
}

const statusMensalidade: Record<string, { label: string; cls: string }> = {
  pago: { label: "Pago", cls: "bg-success/15 text-success" },
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning" },
  atrasado: { label: "Atrasado", cls: "bg-destructive/15 text-destructive" },
}

export default async function AtletaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const atletaId = Number(id)
  const data = await getAtleta(atletaId)
  if (!data) notFound()
  const hist = await getHistoricoAtleta(atletaId)
  const a = data.atleta
  const badge = bolsaBadge(a.descontoTipo as DescontoTipo, Number(a.descontoValor))
  const calc = calcularMensalidade(Number(a.valorMensalidade), a.descontoTipo as DescontoTipo, Number(a.descontoValor))

  return (
    <AppShell
      title="Ficha do Atleta"
      subtitle="Dados, financeiro e frequência"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/atletas"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Link
            href={`/atletas/${atletaId}/editar`}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Coluna esquerda: perfil */}
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-extrabold text-primary">
                {initials(a.nome)}
              </span>
              <div>
                <h2 className="text-lg font-bold">{a.nome}</h2>
                <p className="text-sm text-muted-foreground">{data.turmaNome ?? "Sem turma"} · {data.categoriaNome ?? "—"}</p>
              </div>
              {a.ativo ? (
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">Ativo</span>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Inativo</span>
              )}
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              <InfoRow icon={IdCard} label="CPF" value={a.cpf ?? "—"} />
              <InfoRow icon={Phone} label="Telefone" value={a.telefone ?? "—"} />
              <InfoRow icon={Mail} label="E-mail" value={a.email ?? "—"} />
              <InfoRow icon={CalendarDays} label="Nascimento" value={formatDate(a.dataNascimento)} />
              {a.responsavel && <InfoRow icon={Phone} label="Responsável" value={`${a.responsavel}${a.telefoneResponsavel ? ` · ${a.telefoneResponsavel}` : ""}`} />}
            </ul>
          </Panel>

          <Panel title="Mensalidade">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-2xl font-extrabold text-primary">{brl(calc.final)}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            {calc.desconto > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Valor base <span className="line-through">{brl(calc.base)}</span> · desconto {brl(calc.desconto)}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {labelDesconto[a.descontoTipo as DescontoTipo]}
              {badge && <span className="ml-2 rounded-md bg-info/15 px-1.5 py-0.5 text-[11px] font-semibold text-info">{badge}</span>}
            </p>
          </Panel>

          <Panel title="Frequência geral">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold">{hist.frequencia}%</span>
              <span className="mb-1 text-sm text-muted-foreground">em {hist.totalChamadas} chamadas</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${hist.frequencia}%`,
                  backgroundColor: hist.frequencia >= 75 ? "var(--color-success)" : "var(--color-destructive)",
                }}
              />
            </div>
          </Panel>
        </div>

        {/* Coluna direita: históricos */}
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Histórico financeiro">
            {hist.mensalidades.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensalidade lançada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Competência</th>
                      <th className="px-3 py-2 font-semibold">Vencimento</th>
                      <th className="px-3 py-2 font-semibold">Valor</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {hist.mensalidades.map((m) => {
                      const st = statusMensalidade[m.status] ?? statusMensalidade.pendente
                      return (
                        <tr key={m.id}>
                          <td className="px-3 py-2.5 font-medium">{competenciaLabel(m.competencia)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDate(m.dataVencimento)}</td>
                          <td className="px-3 py-2.5 font-semibold">{brl(m.valor)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Histórico de frequência">
            {hist.presencas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {hist.presencas.map((p) => {
                  const st = statusChamada[p.status] ?? statusChamada.ausente
                  return (
                    <li key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${st.cls}`}>
                      {formatDate(p.data)} · {st.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium">{value}</span>
    </li>
  )
}
