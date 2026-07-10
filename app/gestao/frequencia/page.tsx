import { AppShell } from "@/components/gestao/app-shell"
import { frequenciaPorAtleta, frequenciaPorCategoria, frequenciaPorTurma } from "@/app/gestao/actions/frequencia"

export const dynamic = "force-dynamic"

function barColor(p: number) {
  if (p >= 80) return "var(--success)"
  if (p >= 60) return "var(--warning)"
  return "var(--destructive)"
}

function Barra({ nome, sub, percentual, total }: { nome: string; sub?: string; percentual: number; total: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{nome}</span>
          <span className="text-sm font-semibold" style={{ color: barColor(percentual) }}>
            {percentual}%
          </span>
        </div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full" style={{ width: `${percentual}%`, backgroundColor: barColor(percentual) }} />
        </div>
      </div>
    </div>
  )
}

export default async function FrequenciaPage() {
  const [porTurma, porCategoria, porAtleta] = await Promise.all([
    frequenciaPorTurma(),
    frequenciaPorCategoria(),
    frequenciaPorAtleta(),
  ])

  const semDados = porTurma.every((t) => t.total === 0)

  return (
    <AppShell title="Frequência" subtitle="Percentual de presença por turma, categoria e atleta">
      {semDados ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          Ainda não há chamadas registradas. Faça um check-in para gerar as estatísticas de frequência.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-lg font-bold">Frequência por Turma</h2>
            <div className="divide-y divide-border">
              {porTurma.map((t) => (
                <Barra key={t.turmaId} nome={t.turmaNome} sub={`${t.presentes}/${t.total} presenças`} percentual={t.percentual} total={t.total} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-lg font-bold">Frequência por Categoria</h2>
            <div className="divide-y divide-border">
              {porCategoria.map((c) => (
                <Barra key={c.categoriaNome} nome={c.categoriaNome} sub={`${c.presentes}/${c.total} presenças`} percentual={c.percentual} total={c.total} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="mb-2 text-lg font-bold">Frequência Individual</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Atleta</th>
                    <th className="px-3 py-2 font-semibold">Turma</th>
                    <th className="px-3 py-2 font-semibold">Presenças</th>
                    <th className="px-3 py-2 font-semibold">Frequência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {porAtleta.map((a) => (
                    <tr key={a.atletaId} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-medium">{a.atletaNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.turmaNome ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.presentes}/{a.total}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: barColor(a.percentual) }}>{a.percentual}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
