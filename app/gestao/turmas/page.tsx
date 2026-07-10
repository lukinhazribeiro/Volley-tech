import Link from "next/link"
import { Plus, Users2, Clock, MapPin, CalendarDays } from "lucide-react"
import { AppShell } from "@/components/gestao/app-shell"
import { listTurmas } from "@/app/actions/turmas"
import { brl } from "@/lib/gestao/format"
import { TurmaCardActions } from "@/components/gestao/turma-card-actions"

export const dynamic = "force-dynamic"

export default async function TurmasPage() {
  const turmas = await listTurmas()

  return (
    <AppShell
      title="Turmas"
      subtitle={`${turmas.length} turmas cadastradas`}
      action={
        <Link
          href="/gestao/turmas/novo"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Turma</span>
        </Link>
      }
    >
      {turmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Users2 className="h-7 w-7" />
          </span>
          <p className="text-sm font-medium">Nenhuma turma cadastrada</p>
          <Link href="/gestao/turmas/novo" className="mt-2 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Nova Turma
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {turmas.map((t) => (
            <div key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Users2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold leading-tight">{t.nome}</h3>
                    <p className="text-xs text-muted-foreground">{t.categoriaNome ?? "Sem categoria"}</p>
                  </div>
                </div>
                {t.ativo ? (
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">Ativa</span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Inativa</span>
                )}
              </div>

              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {t.professor && <li className="flex items-center gap-2"><Users2 className="h-4 w-4 text-primary/70" /> {t.professor}</li>}
                {t.diasSemana && <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary/70" /> {t.diasSemana}</li>}
                {t.horario && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary/70" /> {t.horario}</li>}
                {t.quadra && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary/70" /> {t.quadra}</li>}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-lg font-extrabold text-primary">{brl(t.valorMensalidade)}</p>
                  <p className="text-[11px] text-muted-foreground">Venc. dia {t.diaVencimento} · {t.totalAtletas} atletas</p>
                </div>
                <TurmaCardActions id={t.id} ativo={t.ativo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
