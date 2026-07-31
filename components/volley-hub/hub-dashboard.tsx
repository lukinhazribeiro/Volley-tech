"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Upload, History, TrendingUp, Users2, AlertTriangle, ArrowRight } from "lucide-react"
import { listAthletes, listAllEntries, listImports } from "@/lib/hub/data"
import { buildChapters, overallTrend } from "@/lib/hub/aggregate"
import { HubCard, SectionTitle, TrendBadge, EmptyState } from "./ui"
import type { HubAthlete, HubHistoryEntry, HubImport } from "@/lib/hub/types"

async function loadDashboard() {
  const [athletes, entries, imports] = await Promise.all([
    listAthletes(),
    listAllEntries(),
    listImports(5),
  ])
  return { athletes, entries, imports }
}

export function HubDashboard() {
  const router = useRouter()
  const { data, isLoading } = useSWR("hub-dashboard", loadDashboard)

  const athletes: HubAthlete[] = data?.athletes ?? []
  const entries: HubHistoryEntry[] = data?.entries ?? []
  const imports: HubImport[] = data?.imports ?? []

  // Atletas em evolução: tendência do IPTV entre os últimos capítulos.
  const evolving = athletes
    .map((a) => {
      const chapters = buildChapters(entries.filter((e) => e.athlete_id === a.id))
      const { trend, deltaIPTV } = overallTrend(chapters)
      return { athlete: a, trend, deltaIPTV, chapters: chapters.length }
    })
    .filter((x) => x.chapters >= 2)
    .sort((a, b) => b.deltaIPTV - a.deltaIPTV)

  // Equipes em destaque: mais capítulos registrados.
  const teamMap = new Map<string, number>()
  for (const e of entries) {
    const key = e.team || "Sem equipe"
    teamMap.set(key, (teamMap.get(key) ?? 0) + 1)
  }
  const teams = Array.from(teamMap.entries())
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // Alertas: atletas com queda de desempenho.
  const alerts = evolving.filter((x) => x.trend === "down")

  const recentEntries = [...entries].slice(0, 5)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">
            Centro de inteligência
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Resumo do histórico permanente de atletas e equipes.
          </p>
        </div>
        <Link
          href="/volley-hub/historico"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Importar Histórico
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--hub-muted)]">Carregando…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nenhum histórico ainda"
          description="Importe scouts do Scout Volleyball ou um arquivo .vha para começar a construir a linha do tempo das atletas."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Últimas importações */}
          <HubCard onClick={() => router.push("/volley-hub/historico")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Últimas importações</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {imports.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem importações registradas.</p>
            ) : (
              <ul className="space-y-2">
                {imports.map((imp) => (
                  <li key={imp.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--hub-text)]">{imp.label || imp.kind}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--hub-muted)]">
                      {imp.entries_count} registro(s)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          {/* Últimos históricos adicionados */}
          <HubCard onClick={() => router.push("/volley-hub/linha-do-tempo")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Últimos históricos</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            <ul className="space-y-2">
              {recentEntries.map((e) => {
                const athlete = athletes.find((a) => a.id === e.athlete_id)
                return (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--hub-text)]">
                      {athlete?.full_name ?? "Atleta"} — {e.competition ?? "—"}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--hub-muted)]">{e.season}</span>
                  </li>
                )
              })}
            </ul>
          </HubCard>

          {/* Atletas em evolução */}
          <HubCard onClick={() => router.push("/volley-hub/iptv-atleta")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Atletas em evolução</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {evolving.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">
                É preciso pelo menos duas competições por atleta para medir evolução.
              </p>
            ) : (
              <ul className="space-y-2">
                {evolving.slice(0, 5).map((x) => (
                  <li key={x.athlete.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--hub-text)]">{x.athlete.full_name}</span>
                    <TrendBadge trend={x.trend} />
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          {/* Equipes em destaque */}
          <HubCard onClick={() => router.push("/volley-hub/iptv-equipe")}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-[var(--hub-accent)]" />
                <h3 className="font-semibold">Equipes em destaque</h3>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--hub-muted)]" />
            </div>
            {teams.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem equipes registradas.</p>
            ) : (
              <ul className="space-y-2">
                {teams.map((t) => (
                  <li key={t.team} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--hub-text)]">{t.team}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--hub-muted)]">
                      {t.count} capítulo(s)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          {/* Alertas inteligentes */}
          <HubCard className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold">Alertas inteligentes</h3>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">
                Nenhum alerta no momento — nenhuma atleta apresentou queda relevante de desempenho.
              </p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((x) => (
                  <li
                    key={x.athlete.id}
                    className="flex items-center justify-between rounded-lg bg-amber-400/5 px-3 py-2 text-sm"
                  >
                    <span className="text-[var(--hub-text)]">
                      {x.athlete.full_name} apresentou queda no índice técnico ({x.deltaIPTV} pts).
                    </span>
                    <Link
                      href={`/volley-hub/iptv-atleta?athlete=${x.athlete.id}`}
                      className="ml-2 shrink-0 text-xs font-medium text-[var(--hub-accent)] hover:underline"
                    >
                      Ver perfil
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>
        </div>
      )}
    </div>
  )
}
