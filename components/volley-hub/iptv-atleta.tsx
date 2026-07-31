"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import { listAthletes, listEntriesForAthlete } from "@/lib/hub/data"
import { buildAthleteProfile } from "@/lib/hub/aggregate"
import { AthletePicker } from "./athlete-picker"
import { HubCard, TrendBadge, FundamentalBar, EmptyState } from "./ui"
import { exportAthletePdf } from "@/lib/hub/export-pdf"
import { buildVHA, downloadVHA } from "@/lib/hub/vha"
import { FUNDAMENTALS, FUNDAMENTAL_LABELS } from "@/lib/hub/stats"
import { percentuais } from "@/lib/hub/intelligence"
import type { HubHistoryEntry } from "@/lib/hub/types"
import { User, FileDown, Filter, Activity, Download, Sparkles } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

export function IptvAtleta() {
  const router = useRouter()
  const params = useSearchParams()
  const athleteId = params.get("athlete") ?? ""

  const [competition, setCompetition] = useState<string>("all")
  const [season, setSeason] = useState<string>("all")

  const { data: athletes } = useSWR("hub-athletes", listAthletes)
  const { data: entries, isLoading } = useSWR(
    athleteId ? ["hub-athlete-entries", athleteId] : null,
    () => listEntriesForAthlete(athleteId),
  )

  const athlete = athletes?.find((a) => a.id === athleteId)

  const seasons = useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.season).filter(Boolean))) as string[],
    [entries],
  )
  const competitions = useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.competition).filter(Boolean))) as string[],
    [entries],
  )

  const filtered = useMemo(() => {
    return (entries ?? []).filter((e) => {
      if (season !== "all" && e.season !== season) return false
      if (competition !== "all" && e.competition !== competition) return false
      return true
    })
  }, [entries, season, competition])

  const profile = useMemo(
    () => (athlete ? buildAthleteProfile(athlete, filtered) : null),
    [athlete, filtered],
  )

  const chartData = useMemo(() => buildChartData(filtered), [filtered])

  function handlePicked(id: string) {
    router.push(`/volley-hub/iptv-atleta?athlete=${id}`)
  }

  async function handlePdf() {
    if (!athlete) return
    await exportAthletePdf(athlete, filtered)
  }

  function handleVha() {
    if (!athlete) return
    downloadVHA(athlete.full_name, buildVHA(athlete, entries ?? []))
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--hub-accent)]">
            Índice de Performance Técnica
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">IPTV Atleta</h1>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Perfil, evolução dos fundamentos e avaliação inteligente.
          </p>
        </div>
        {profile && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleVha}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm font-medium text-[var(--hub-text)] transition-colors hover:border-[var(--hub-accent)]"
            >
              <Download className="h-4 w-4" />
              Exportar .vha
            </button>
            <button
              onClick={handlePdf}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </button>
          </div>
        )}
      </header>

      <div className="mb-6">
        <AthletePicker athletes={athletes ?? []} value={athleteId} onChange={handlePicked} />
      </div>

      {!athleteId && (
        <EmptyState
          icon={User}
          title="Selecione uma atleta"
          description="Escolha uma atleta para ver o perfil, a evolução dos fundamentos e a avaliação inteligente."
        />
      )}

      {athleteId && isLoading && (
        <p className="text-sm text-[var(--hub-muted)]">Carregando dados da atleta…</p>
      )}

      {athleteId && !isLoading && profile && (
        <div className="space-y-5">
          {/* Perfil */}
          <HubCard>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hub-accent)]/15 text-[var(--hub-accent)]">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--hub-text)]">
                    {profile.athlete.full_name}
                  </p>
                  <p className="text-sm text-[var(--hub-muted)]">
                    {profile.athlete.position ?? "Posição não informada"}
                  </p>
                </div>
              </div>
              <ProfileStat label="Equipe" value={profile.athlete.team ?? "—"} />
              <ProfileStat label="Categoria" value={profile.athlete.category ?? "—"} />
              <ProfileStat label="IPTV" value={String(profile.iptv)} accent />
              <ProfileStat label="Competições" value={String(profile.competitionsCount)} />
              <ProfileStat label="Scouts" value={String(profile.entriesCount)} />
            </div>
          </HubCard>

          {/* Filtros */}
          <HubCard>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--hub-text)]">
              <Filter className="h-4 w-4 text-[var(--hub-accent)]" />
              Filtros
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <FilterSelect
                label="Competição"
                value={competition}
                onChange={setCompetition}
                options={competitions}
              />
              <FilterSelect label="Temporada" value={season} onChange={setSeason} options={seasons} />
            </div>
          </HubCard>

          {/* Evolução dos fundamentos */}
          <HubCard>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--hub-accent)]" />
              <h2 className="text-base font-semibold text-[var(--hub-text)]">
                Evolução dos fundamentos
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FUNDAMENTALS.map((key) => {
                const f = profile.fundamentals[key]
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)]/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--hub-muted)]">
                        {FUNDAMENTAL_LABELS[key]}
                      </span>
                      <TrendBadge trend={f.trend} />
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-[var(--hub-text)]">
                      {f.percentage}%
                    </p>
                    <FundamentalBar value={f.percentage} />
                    <p className="mt-1 text-xs text-[var(--hub-muted)]">{f.total} ações analisadas</p>
                  </div>
                )
              })}
            </div>

            {chartData.length > 1 && (
              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#475569" />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      stroke="#475569"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#f8fafc",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Ataque" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Recepção" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Defesa" stroke="#eab308" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Bloqueio" stroke="#a855f7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Saque" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </HubCard>

          {/* Avaliação Inteligente */}
          <HubCard>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--hub-accent)]" />
              <h2 className="text-base font-semibold text-[var(--hub-text)]">Avaliação Inteligente</h2>
            </div>
            <p className="leading-relaxed text-[var(--hub-text)]">{profile.assessment}</p>
          </HubCard>
        </div>
      )}
    </div>
  )
}

function ProfileStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">{label}</p>
      <p className={`text-sm font-semibold ${accent ? "text-[var(--hub-accent)]" : "text-[var(--hub-text)]"}`}>
        {value}
      </p>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--hub-muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
      >
        <option value="all">Todas</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Série temporal por scout (ordem cronológica) com % de cada fundamento. */
function buildChartData(entries: HubHistoryEntry[]) {
  const sorted = [...entries].sort((a, b) => {
    const da = a.match_date ?? a.created_at
    const db = b.match_date ?? b.created_at
    return new Date(da).getTime() - new Date(db).getTime()
  })
  return sorted.map((e, i) => {
    const p = percentuais(e.stats)
    return {
      label: e.competition ? `${e.competition.slice(0, 10)}` : `#${i + 1}`,
      Ataque: p.ataque,
      Recepção: p.recepcao,
      Defesa: p.defesa,
      Bloqueio: p.bloqueio,
      Saque: p.saque,
    }
  })
}
