import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { AtletaForm } from "@/components/gestao/atleta-form"
import { createAtleta } from "@/app/gestao/actions/atletas"
import { listTurmas } from "@/app/gestao/actions/turmas"
import { listCategorias } from "@/app/gestao/actions/categorias"

export const dynamic = "force-dynamic"

export default async function NovoAtletaPage() {
  const [turmas, categorias] = await Promise.all([listTurmas(), listCategorias()])

  return (
    <AppShell
      title="Novo Atleta"
      subtitle="Cadastro com geração automática de ficha financeira e histórico"
      action={
        <Link
          href="/gestao/atletas"
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl">
        <AtletaForm
          action={createAtleta}
          turmas={turmas.map((t) => ({
            id: t.id,
            nome: t.nome,
            categoriaId: t.categoriaId,
            valorMensalidade: String(t.valorMensalidade),
            diaVencimento: t.diaVencimento,
          }))}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        />
      </div>
    </AppShell>
  )
}
