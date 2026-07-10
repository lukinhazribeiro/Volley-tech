import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { TurmaForm } from "@/components/gestao/turma-form"
import { getTurma, updateTurma } from "@/app/gestao/actions/turmas"
import { listCategorias } from "@/app/gestao/actions/categorias"

export const dynamic = "force-dynamic"

export default async function EditarTurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const turmaId = Number(id)
  const [t, categorias] = await Promise.all([getTurma(turmaId), listCategorias()])
  if (!t) notFound()
  const updateWithId = updateTurma.bind(null, turmaId)

  return (
    <AppShell
      title={`Editar: ${t.nome}`}
      subtitle="Atualize dados e valor da turma"
      action={
        <Link href="/gestao/turmas" className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <TurmaForm
        action={updateWithId}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        initial={{
          id: t.id,
          nome: t.nome,
          categoriaId: t.categoriaId,
          professor: t.professor,
          diasSemana: t.diasSemana,
          horario: t.horario,
          quadra: t.quadra,
          valorMensalidade: String(t.valorMensalidade),
          diaVencimento: t.diaVencimento,
        }}
      />
    </AppShell>
  )
}
