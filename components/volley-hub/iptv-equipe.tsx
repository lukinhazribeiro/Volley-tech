"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { HubCard, EvolutionRow, IptvBadge, EmptyState } from "./ui"
import { listTeams, listEntriesForTeam, listAthletes, deleteAthlete } from "@/lib/hub/data"
import { buildChapters, overallTrend } from "@/lib/hub/aggregate"
import { aggregateFundamentals, FUNDAMENTALS, FUNDAMENTAL_LABELS, successRate, trendFrom } from "@/lib/hub/stats"
import { computeIPTV, generateEvaluation } from "@/lib/hub/intelligence"
import { Button } from "@/components/ui/button"
import { FileDown, Sparkles, Filter, Trash2, ChevronLeft, Users, Search } from "lucide-react"

export function IptvEquipe() {
  const [team, setTeam] = useState<string>("")
  const [teamQuery, setTeamQuery] = useState("")
  const [season, setSeason] = useState<string>("all")
  const [competition, setCompetition] = useState<string>("all")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const { mutate } = useSWRConfig()

  const { data: teams } = useSWR("hub-teams", listTeams)
  const { data: athletes } = useSWR("hub-athletes-picker", listAthletes)
  const { data: entries, isLoading } = useSWR(team ? ["hub-team-entries", team] : null, () =>
    listEntriesForTeam(team),
  )

  const filtered = (entries ?? []).filter(
    (e) => (season === "all" || e.season === season) && (competition === "all" || e.competition === competition),
  )

  // Ranking por jogador: agrega os capítulos de cada atleta e calcula o IPTV.
  const nameById = new Map((athletes ?? []).map((a) => [a.id, a]))
  const byAthlete = new Map<string, typeof filtered>()
  for (const e of filtered) {
    if (!e.athlete_id) continue
    const list = byAthlete.get(e.athlete_id) ?? []
    list.push(e)
    byAthlete.set(e.athlete_id, list)
  }
  const players = Array.from(byAthlete.entries())
    .map(([id, list]) => {
      const agg = aggregateFundamentals(list.map((e) => e.stats))
      const athlete = nameById.get(id)
      const fallback = list[0]?.player_number != null ? `Atleta ${list[0].player_number}` : "Atleta"
      return {
        id,
        name: athlete?.full_name ?? fallback,
        position: athlete?.position ?? "",
        iptv: computeIPTV(agg),
        chapters: list.length,
      }
    })
    .sort((a, b) => b.iptv - a.iptv)

  async function handleDeletePlayer(id: string) {
    setDeletingId(id)
    setDeleteError("")
    try {
      await deleteAthlete(id)
      setConfirmingId(null)
      await Promise.all([
        mutate(["hub-team-entries", team]),
        mutate("hub-teams"),
        mutate("hub-athletes-picker"),
      ])
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Não foi possível excluir a atleta.")
    } finally {
      setDeletingId(null)
    }
  }

  const seasons = Array.from(new Set((entries ?? []).map((e) => e.season).filter(Boolean))) as string[]
  const competitions = Array.from(new Set((entries ?? []).map((e) => e.competition).filter(Boolean))) as string[]

  const chapters = buildChapters(filtered)
  const overall = filtered.length > 0 ? aggregateFundamentals(filtered.map((e) => e.stats)) : null
  const { trend } = overallTrend(chapters)
  const athleteCount = new Set(filtered.map((e) => e.athlete_id).filter(Boolean)).size

  const barData = overall
    ? FUNDAMENTALS.filter((k) => overall[k].total > 0).map((k) => ({
        name: FUNDAMENTAL_LABELS[k],
        pct: successRate(overall[k]),
      }))
    : []

  const last = chapters[chapters.length - 1]
  const prev = chapters[chapters.length - 2]
  const evaluation =
    overall && last
      ? generateEvaluation({
          athleteName: team,
          position: "",
          current: last.fundamentals,
          previous: prev?.fundamentals,
        })
      : ""

  function handlePrint() {
    window.print()
  }

  // Sem equipe selecionada: grade de equipes (mesmo modelo em cartões).
  if (!team) {
    const teamList = teams ?? []
    const q = teamQuery.trim().toLowerCase()
    const visibleTeams = q ? teamList.filter((t) => t.team.toLowerCase().includes(q)) : teamList
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--hub-text)]">Equipes registradas</h2>
          <p className="text-sm text-[var(--hub-muted)]">
            Clique numa equipe para ver o índice técnico, a evolução dos fundamentos e a avaliação inteligente.
          </p>
        </div>

        {teamList.length > 6 && (
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--hub-muted)]" />
            <input
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
              placeholder="Buscar equipe..."
              className="h-10 w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] pl-9 pr-3 text-sm text-[var(--hub-text)]"
            />
          </div>
        )}

        {visibleTeams.length === 0 ? (
          <EmptyState
            title={teamList.length === 0 ? "Nenhuma equipe" : "Nada encontrado"}
            description={
              teamList.length === 0
                ? "Importe scouts para registrar equipes no Volley Tech."
                : "Nenhuma equipe corresponde à busca."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTeams.map((t) => (
              <button
                key={t.team}
                type="button"
                onClick={() => {
                  setTeam(t.team)
                  setSeason("all")
                  setCompetition("all")
                }}
                className="flex items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-4 text-left transition-colors hover:border-[var(--hub-accent)] hover:bg-[var(--hub-bg-deep)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--hub-bg-deep)]">
                  <Users className="size-5 text-[var(--hub-accent)]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--hub-text)]">{t.team}</span>
                  <span className="block text-xs text-[var(--hub-muted)]">
                    {t.athletes} atleta(s) · {t.entries} capítulo(s)
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da equipe selecionada + filtros */}
      <HubCard>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => setTeam("")} className="gap-2 px-2">
            <ChevronLeft className="size-4" />
            Todas as equipes
          </Button>
          {chapters.length > 0 && (
            <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent">
              <FileDown className="size-4" />
              Gerar PDF
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-36">
            <label className="mb-1.5 block text-sm font-medium text-[var(--hub-muted)]">Temporada</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 text-sm text-[var(--hub-text)]"
            >
              <option value="all">Todas</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-40">
            <label className="mb-1.5 block text-sm font-medium text-[var(--hub-muted)]">Competição</label>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 text-sm text-[var(--hub-text)]"
            >
              <option value="all">Todas</option>
              {competitions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </HubCard>

      {isLoading && <p className="text-sm text-[var(--hub-muted)]">Carregando dados da equipe...</p>}

      {!isLoading && filtered.length === 0 && (
        <EmptyState title="Sem dados" description="Não há histórico para os filtros selecionados." />
      )}

      {!isLoading && overall && filtered.length > 0 && (
        <>
          <HubCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--hub-text)]">{team}</h2>
                <p className="flex items-center gap-1.5 text-sm text-[var(--hub-muted)]">
                  <Filter className="size-3.5" />
                  {athleteCount} atletas · {filtered.length} capítulos
                </p>
              </div>
              <IptvBadge value={computeIPTV(overall)} trend={trend} label="IPTV equipe" />
            </div>
          </HubCard>

          <HubCard title="Evolução dos fundamentos" description="Aproveitamento médio da equipe por fundamento.">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hub-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--hub-muted)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--hub-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--hub-surface)",
                      border: "1px solid var(--hub-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="pct" name="Aproveitamento" fill="var(--hub-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </HubCard>

          <HubCard title="Indicadores" description="Percentual e tendência entre a última e a penúltima competição.">
            <div className="divide-y divide-[var(--hub-border)]">
              {FUNDAMENTALS.map((key) => {
                if (overall[key].total === 0) return null
                const curPct = last ? successRate(last.fundamentals[key]) : successRate(overall[key])
                const prevPct = prev && prev.fundamentals[key].total > 0 ? successRate(prev.fundamentals[key]) : null
                const t = prevPct !== null ? trendFrom(prevPct, curPct) : "stable"
                return (
                  <EvolutionRow
                    key={key}
                    label={FUNDAMENTAL_LABELS[key]}
                    percent={curPct}
                    trend={t}
                    hint={prevPct !== null ? `anterior ${prevPct}%` : "sem histórico anterior"}
                  />
                )
              })}
            </div>
          </HubCard>

          <HubCard
            title="Atletas da equipe"
            description="IPTV individual de cada jogador. Use a lixeira para remover uma atleta do histórico."
          >
            {deleteError && (
              <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
            {players.length === 0 ? (
              <p className="text-sm text-[var(--hub-muted)]">Sem atletas para os filtros selecionados.</p>
            ) : (
              <ul className="divide-y divide-[var(--hub-border)]">
                {players.map((p, idx) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="w-6 text-sm font-semibold text-[var(--hub-muted)]">{idx + 1}º</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--hub-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--hub-muted)]">
                        {[p.position, `${p.chapters} capítulo(s)`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <IptvBadge value={p.iptv} label="IPTV" />
                    {confirmingId === p.id ? (
                      <span className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePlayer(p.id)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? "Excluindo..." : "Excluir"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmingId(null)}
                          disabled={deletingId === p.id}
                        >
                          Cancelar
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmingId(p.id)}
                        aria-label={`Excluir ${p.name}`}
                        title="Excluir atleta do histórico"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          <HubCard
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--hub-accent)]" />
                Avaliação Inteligente
              </span>
            }
            description="Texto gerado automaticamente a partir dos dados de scout da equipe."
          >
            <p className="text-pretty leading-relaxed text-[var(--hub-text)]">{evaluation}</p>
          </HubCard>
        </>
      )}
    </div>
  )
}
