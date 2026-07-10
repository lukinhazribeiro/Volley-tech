import { getTurmasParaChamada } from "@/app/actions/checkin"
import { CheckinPanel } from "@/components/gestao/checkin-panel"
import { AppShell } from "@/components/gestao/app-shell"

export const dynamic = "force-dynamic"

export default async function CheckinPage() {
  const turmas = await getTurmasParaChamada()

  return (
    <AppShell title="Check-in" subtitle="Lista de chamada por turma">
      {turmas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          Cadastre uma turma e vincule atletas para iniciar a chamada.
        </div>
      ) : (
        <CheckinPanel turmas={turmas} />
      )}
    </AppShell>
  )
}
