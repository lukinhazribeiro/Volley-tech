import { AppShell } from "@/components/gestao/app-shell"
import { listCategorias } from "@/app/gestao/actions/categorias"
import { listTurmas } from "@/app/gestao/actions/turmas"
import { listAtletas } from "@/app/gestao/actions/atletas"
import { getGestaoConfig, saveGestaoConfig } from "@/app/gestao/actions/configuracoes"
import { ConfigForm } from "@/components/gestao/config-form"
import { Building2, Users, Users2, Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ConfiguracoesPage() {
  const [categorias, turmas, atletas, config] = await Promise.all([
    listCategorias(),
    listTurmas(),
    listAtletas(),
    getGestaoConfig(),
  ])

  const stats = [
    { icon: Users, label: "Atletas cadastrados", value: atletas.length },
    { icon: Users2, label: "Turmas ativas", value: turmas.filter((t) => t.ativo).length },
    { icon: Layers, label: "Categorias", value: categorias.length },
  ]

  return (
    <AppShell title="Configurações" subtitle="Dados gerais do clube">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          )
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Voley Tech — Gestão de Clube</h2>
            <p className="text-sm text-muted-foreground">
              Plataforma escalável, preparada para novos módulos (treinadores, quadras, campeonatos e mais).
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-1 text-base font-bold">Dados do clube</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Informe o administrador e o clube. O clube é vinculado ao processo e usado como o clube das
            atletas no VIB.
          </p>
          <ConfigForm initial={config} action={saveGestaoConfig} />
        </div>
      </section>
    </AppShell>
  )
}
