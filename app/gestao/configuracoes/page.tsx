import { AppShell } from "@/components/gestao/app-shell"
import { listCategorias } from "@/app/actions/categorias"
import { listTurmas } from "@/app/actions/turmas"
import { listAtletas } from "@/app/actions/atletas"
import { Building2, Users, Users2, Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ConfiguracoesPage() {
  const [categorias, turmas, atletas] = await Promise.all([listCategorias(), listTurmas(), listAtletas()])

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
      </section>
    </AppShell>
  )
}
