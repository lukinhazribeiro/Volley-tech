"use client"

import { useState } from "react"
import useSWR from "swr"
import { FolderOpen, FileUp, Video } from "lucide-react"
import { listAllEntries, listAthletes } from "@/lib/hub/data"
import { HubCard, SectionTitle, EmptyState } from "./ui"
import { ImportWizard } from "./import-wizard"
import type { HubAthlete, HubHistoryEntry } from "@/lib/hub/types"

async function loadHistory() {
  const [athletes, entries] = await Promise.all([listAthletes(), listAllEntries()])
  return { athletes, entries }
}

export function HubHistoryView() {
  const { data, isLoading, mutate } = useSWR("hub-history", loadHistory)
  const [wizardMode, setWizardMode] = useState<"local" | "video" | "vha" | null>(null)

  const athletes: HubAthlete[] = data?.athletes ?? []
  const entries: HubHistoryEntry[] = data?.entries ?? []

  // Organiza por atleta → competição → temporada
  const byAthlete = athletes
    .map((a) => ({
      athlete: a,
      entries: entries.filter((e) => e.athlete_id === a.id),
    }))
    .filter((x) => x.entries.length > 0)

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">Dados</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="mt-1 text-sm text-[var(--hub-muted)]">
          Importe scouts do Scout Volleyball, do Scout View IA ou arquivos .vha. O histórico original nunca é modificado.
        </p>
      </div>

      {/* Ferramentas de importação */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HubCard onClick={() => setWizardMode("local")}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--hub-accent)]/15 p-2.5">
              <FolderOpen className="h-5 w-5 text-[var(--hub-accent)]" />
            </div>
            <div>
              <h3 className="font-semibold">Importar do Scout Volleyball</h3>
              <p className="mt-1 text-sm text-[var(--hub-muted)]">
                Lê as partidas salvas na sua conta e associa as atletas por nome, equipe e categoria.
              </p>
            </div>
          </div>
        </HubCard>

        <HubCard onClick={() => setWizardMode("video")}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--hub-accent)]/15 p-2.5">
              <Video className="h-5 w-5 text-[var(--hub-accent)]" />
            </div>
            <div>
              <h3 className="font-semibold">Importar do Scout View IA</h3>
              <p className="mt-1 text-sm text-[var(--hub-muted)]">
                Lê o histórico das partidas analisadas por vídeo e traz os fundamentos por atleta.
              </p>
            </div>
          </div>
        </HubCard>

        <HubCard onClick={() => setWizardMode("vha")}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--hub-accent)]/15 p-2.5">
              <FileUp className="h-5 w-5 text-[var(--hub-accent)]" />
            </div>
            <div>
              <h3 className="font-semibold">Importar arquivo .vha</h3>
              <p className="mt-1 text-sm text-[var(--hub-muted)]">
                Volley History Archive. Localiza a atleta e acrescenta os capítulos à linha do tempo.
              </p>
            </div>
          </div>
        </HubCard>
      </div>

      <SectionTitle eyebrow="Organizado por atleta" title="Histórico consolidado" />

      {isLoading ? (
        <p className="text-sm text-[var(--hub-muted)]">Carregando…</p>
      ) : byAthlete.length === 0 ? (
        <EmptyState
          title="Nenhum histórico importado"
          description="Use uma das ferramentas acima para trazer scouts para o Volley Tech."
        />
      ) : (
        <div className="space-y-4">
          {byAthlete.map(({ athlete, entries: aEntries }) => {
            // agrupa por competição+temporada
            const groups = new Map<string, HubHistoryEntry[]>()
            for (const e of aEntries) {
              const key = `${e.competition ?? "—"} · ${e.season ?? "—"}`
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(e)
            }
            return (
              <HubCard key={athlete.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{athlete.full_name}</h3>
                    <p className="text-xs text-[var(--hub-muted)]">
                      {[athlete.team, athlete.category, athlete.position].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--hub-bg-deep)] px-2.5 py-1 text-xs text-[var(--hub-muted)]">
                    {aEntries.length} capítulo(s)
                  </span>
                </div>
                <ul className="divide-y divide-[var(--hub-border)]">
                  {Array.from(groups.entries()).map(([key, list]) => (
                    <li key={key} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-[var(--hub-text)]">{key}</span>
                      <span className="text-xs text-[var(--hub-muted)]">
                        {list[0].team} · #{list[0].player_number}
                      </span>
                    </li>
                  ))}
                </ul>
              </HubCard>
            )
          })}
        </div>
      )}

      {wizardMode && (
        <ImportWizard
          mode={wizardMode}
          onClose={() => setWizardMode(null)}
          onDone={() => {
            setWizardMode(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}
