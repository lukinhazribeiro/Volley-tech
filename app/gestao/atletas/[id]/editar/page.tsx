import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { AtletaForm } from "@/components/gestao/atleta-form"
import { getAtleta, updateAtleta } from "@/app/gestao/actions/atletas"
import { listTurmas } from "@/app/gestao/actions/turmas"
import { listCategorias } from "@/app/gestao/actions/categorias"
import type { DescontoTipo } from "@/lib/gestao/format"

export const dynamic = "force-dynamic"

export default async function EditarAtletaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const atletaId = Number(id)
  const [data, turmas, categorias] = await Promise.all([getAtleta(atletaId), listTurmas(), listCategorias()])
  if (!data) notFound()

  const a = data.atleta
  const updateWithId = updateAtleta.bind(null, atletaId)

  return (
    <AppShell
      title={`Editar: ${a.nome}`}
      subtitle="Atualize dados, valor e bolsa do atleta"
      action={
        <Link
          href={`/gestao/atletas/${atletaId}`}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl">
        <AtletaForm
          action={updateWithId}
          turmas={turmas.map((t) => ({
            id: t.id,
            nome: t.nome,
            categoriaId: t.categoriaId,
            valorMensalidade: String(t.valorMensalidade),
            diaVencimento: t.diaVencimento,
          }))}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
          initial={{
            id: a.id,
            nome: a.nome,
            cpf: a.cpf,
            telefone: a.telefone,
            email: a.email,
            dataNascimento: a.dataNascimento,
            dataInscricao: a.dataInscricao,
            responsavel: a.responsavel,
            telefoneResponsavel: a.telefoneResponsavel,
            categoriaId: a.categoriaId,
            turmaId: a.turmaId,
            valorMensalidade: String(a.valorMensalidade),
            descontoTipo: a.descontoTipo as DescontoTipo,
            descontoValor: String(a.descontoValor),
          }}
        />
      </div>
    </AppShell>
  )
}
