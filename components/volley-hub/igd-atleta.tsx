"use client"

import { useState } from "react"
import useSWR from "swr"
import { AthletePicker } from "./athlete-picker"
import { HubCard, EmptyState } from "./ui"
import { getAthlete, listEntriesForAthlete } from "@/lib/hub/data"
import { listAssessments } from "@/lib/hub/physical"
import { computeIGD, igdLabel } from "@/lib/hub/igd"
import { Activity, Dumbbell, Target } from "lucide-react"

/** Card de uma parcela do IGD (IPTV, IPF ou TGP). */
function PartCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity
  label: string
  value: number | null
  hint: string
}) {
  return (
    <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-4">
      <div className="mb-2 flex items-center gap-2 text-[var(--hub-muted)]">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-[var(--hub-text)]">
        {value != null ? value : "—"}
      </p>
      <p className="mt-1 text-xs text-[var(--hub-muted)]">{hint}</p>
    </div>
  )
}

export function IgdAtleta({ initialAthleteId }: { initialAthleteId?: string }) {
  const [athleteId, setAthleteId] = useState<string | undefined>(initialAthleteId)

  const { data, isLoading } = useSWR(athleteId ? ["igd-atleta", athleteId] : null, async () => {
    const [athlete, entries, assessments] = await Promise.all([
      getAthlete(athleteId!),
      listEntriesForAthlete(athleteId!),
      listAssessments(athleteId!),
    ])
    return { athlete, entries, assessments }
  })

  const parts = data ? computeIGD(data.entries, data.assessments) : null

  return (
    <div className="space-y-6">
      <div className="w-full sm:max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-[var(--hub-muted)]">Atleta</label>
        <AthletePicker value={athleteId} onChange={setAthleteId} />
      </div>

      {!athleteId && (
        <EmptyState
          title="Selecione uma atleta"
          description="O IGD combina o desempenho técnico (IPTV), o físico (IPF) e o Último TGP num único índice de desenvolvimento."
        />
      )}

      {athleteId && isLoading && <p className="text-sm text-[var(--hub-muted)]">Calculando IGD...</p>}

      {athleteId && !isLoading && data?.athlete && parts && (
        <>
          {/* Índice geral */}
          <HubCard>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-[var(--hub-muted)]">{data.athlete.full_name}</p>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">
                Índice Geral de Desenvolvimento
              </p>
              <p className="text-6xl font-bold tabular-nums text-[var(--hub-accent)]">
                {parts.igd != null ? parts.igd : "—"}
              </p>
              <p className="text-sm font-medium text-[var(--hub-text)]">{igdLabel(parts.igd)}</p>
            </div>
          </HubCard>

          {/* Parcelas que compõem o IGD */}
          <HubCard
            title="Composição do índice"
            description="O IGD é a média das parcelas disponíveis. É recalculado automaticamente a cada novo scout ou avaliação física."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PartCard icon={Activity} label="Média IPTV" value={parts.iptv} hint="Desempenho técnico" />
              <PartCard icon={Dumbbell} label="Média IPF" value={parts.ipf} hint="Desempenho físico" />
              <PartCard icon={Target} label="Último TGP" value={parts.tgp} hint="Participação nos pontos" />
            </div>
          </HubCard>

          {parts.igd == null && (
            <EmptyState
              title="Ainda sem dados"
              description="Importe scouts (IPTV) ou cadastre avaliações físicas (IPF) para gerar o IGD desta atleta."
            />
          )}
        </>
      )}
    </div>
  )
}
