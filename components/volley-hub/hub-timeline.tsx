"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { CalendarClock, Trophy, ChevronLeft } from "lucide-react"
import { listAthletes, listEntriesForAthlete } from "@/lib/hub/data"
import { buildChapters } from "@/lib/hub/aggregate"
import { FUNDAMENTALS, FUNDAMENTAL_LABELS, successRate } from "@/lib/hub/stats"
import { AthleteGrid } from "./athlete-grid"
import { HubCard, EmptyState } from "./ui"
import { Button } from "@/components/ui/button"
import type { HubAthlete } from "@/lib/hub/types"

export function HubTimeline() {
  const searchParams = useSearchParams()
  const { data: athletes } = useSWR("hub-athletes", listAthletes)
  const [athleteId, setAthleteId] = useState("")

  useEffect(() => {
    const fromUrl = searchParams.get("athlete")
    if (fromUrl) setAthleteId(fromUrl)
  }, [searchParams])

  const list: HubAthlete[] = athletes ?? []
  const { data: entries } = useSWR(athleteId ? ["timeline", athleteId] : null, () =>
    listEntriesForAthlete(athleteId),
  )
  const chapters = buildChapters(entries ?? [])
  const athlete = list.find((a) => a.id === athleteId)

  // Sem atleta selecionada: grade de todas as atletas registradas.
  if (!athleteId) {
    return (
      <div>
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">Carreira</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Linha do Tempo</h1>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Clique numa atleta para ver sua trajetória, temporada a temporada.
          </p>
        </div>
        <AthleteGrid onSelect={setAthleteId} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setAthleteId("")} className="gap-2 px-2">
          <ChevronLeft className="size-4" />
          Todas as atletas
        </Button>
      </div>

      {chapters.length === 0 ? (
        <EmptyState
          title="Sem capítulos"
          description="Esta atleta ainda não tem histórico importado no Volley Tech."
        />
      ) : (
        <div>
          {athlete && (
            <div className="mb-6 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-5">
              <h2 className="text-xl font-semibold">{athlete.full_name}</h2>
              <p className="text-sm text-[var(--hub-muted)]">
                {[athlete.team, athlete.category, athlete.position].filter(Boolean).join(" · ") || "—"} ·{" "}
                {chapters.length} capítulo(s)
              </p>
            </div>
          )}

          {/* linha do tempo vertical */}
          <ol className="relative border-l border-[var(--hub-border)] pl-6">
            {chapters.map((c, i) => (
              <li key={c.key} className="mb-8 last:mb-0">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-[var(--hub-accent)] ring-4 ring-[var(--hub-bg)]" />
                <HubCard>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-[var(--hub-accent)]" />
                      <h3 className="font-semibold">{c.competition || "Competição"}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hub-bg-deep)] px-2.5 py-1 text-xs text-[var(--hub-muted)]">
                      <CalendarClock className="h-3 w-3" />
                      {c.season || "—"}
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-[var(--hub-muted)]">
                    {[c.team, c.category].filter(Boolean).join(" · ") || "—"} · IPTV{" "}
                    <span className="font-semibold text-[var(--hub-accent)]">{c.iptv}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
                    {FUNDAMENTALS.map((f) => (
                      <div key={f} className="text-center">
                        <p className="text-lg font-semibold text-[var(--hub-text)]">
                          {successRate(c.fundamentals[f])}%
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--hub-muted)]">
                          {FUNDAMENTAL_LABELS[f]}
                        </p>
                      </div>
                    ))}
                  </div>
                </HubCard>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
