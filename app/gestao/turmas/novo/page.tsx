import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { TurmaForm } from "@/components/gestao/turma-form"
import { createTurma } from "@/app/actions/turmas"
import { listCategorias } from "@/app/actions/categorias"

export const dynamic = "force-dynamic"

export default async function NovaTurmaPage() {
  const categorias = await listCategorias()
  return (
    <AppShell
      title="Nova Turma"
      subtitle="Defina horários, professor e valor da mensalidade"
      action={
        <Link href="/turmas" className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      }
    >
      <TurmaForm action={createTurma} categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))} />
    </AppShell>
  )
}
