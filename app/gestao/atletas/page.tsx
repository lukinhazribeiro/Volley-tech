import Link from "next/link"
import { Plus, Search, Users } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { listAtletas } from "@/app/actions/atletas"
import { brl, initials, bolsaBadge } from "@/lib/format"
import { AtletaRowActions } from "@/components/gestao/atleta-row-actions"

export const dynamic = "force-dynamic"

export default async function AtletasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const atletas = await listAtletas(q)
  const ativos = atletas.filter((a) => a.ativo).length

  return (
    <AppShell
      title="Atletas"
      subtitle={`${atletas.length} cadastrados · ${ativos} ativos`}
      action={
        <Link
          href="/atletas/novo"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Atleta</span>
        </Link>
      }
    >
      <form className="relative max-w-md" action="/atletas">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Pesquisar por nome, CPF ou telefone..."
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/20">
        {atletas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Users className="h-7 w-7" />
            </span>
            <p className="text-sm font-medium">Nenhum atleta encontrado</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Comece cadastrando seu primeiro atleta. A ficha financeira e o histórico são criados automaticamente.
            </p>
            <Link href="/atletas/novo" className="mt-2 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Novo Atleta
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Atleta</th>
                  <th className="px-5 py-3 font-semibold">Turma</th>
                  <th className="px-5 py-3 font-semibold">Categoria</th>
                  <th className="px-5 py-3 font-semibold">Mensalidade</th>
                  <th className="px-5 py-3 font-semibold">Situação</th>
                  <th className="px-5 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {atletas.map((a) => {
                  const badge = bolsaBadge(a.descontoTipo as any, Number(a.descontoValor))
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-3">
                        <Link href={`/atletas/${a.id}`} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {initials(a.nome)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{a.nome}</span>
                            <span className="block truncate text-xs text-muted-foreground">{a.telefone ?? a.cpf ?? "—"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{a.turmaNome ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{a.categoriaNome ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="font-semibold">{brl(a.valorMensalidade)}</span>
                        {badge && (
                          <span className="ml-2 rounded-md bg-info/15 px-1.5 py-0.5 text-[10px] font-semibold text-info">
                            {badge}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {a.ativo ? (
                          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">Ativo</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Inativo</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <AtletaRowActions id={a.id} ativo={a.ativo} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
