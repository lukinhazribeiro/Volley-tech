"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
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
import { AthletePicker } from "./athlete-picker"
import { HubCard, EvolutionRow, IptvBadge, EmptyState } from "./ui"
import { getAthlete, listEntriesForAthlete, deleteAthlete } from "@/lib/hub/data"
import { buildChapters, evolutionSeries, overallTrend } from "@/lib/hub/aggregate"
import { aggregateFundamentals, FUNDAMENTALS, FUNDAMENTAL_LABELS, successRate, trendFrom } from "@/lib/hub/stats"
import { computeIPTV, generateEvaluation } from "@/lib/hub/intelligence"
import { exportAthletePdf } from "@/lib/hub/export-pdf"
import { Button } from "@/components/ui/button"
import { FileDown, Sparkles, Trash2 } from "lucide-react"

const FUND_COLORS: Record<string, string> = {
  ataque: "var(--chart-1)",
  recepcao: "var(--chart-2)",
  defesa: "var(--chart-3)",
  bloqueio: "var(--chart-4)",
  saque: "var(--chart-5)",
}

export function IptvAtleta({ initialAthleteId }: { initialAthleteId?: string }) {
  const [athleteId, setAthleteId] = useState<string | undefined>(initialAthleteId)
  const [exporting, setExporting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const { mutate } = useSWRConfig()

  const { data, isLoading } = useSWR(athleteId ? ["iptv-atleta", athleteId] : null, async () => {
    const [athlete, entries] = await Promise.all([getAthlete(athleteId!), listEntriesForAthlete(athleteId!)])
    return { athlete, entries }
  })

  async function handleDelete() {
    if (!athleteId) return
    setDeleting(true)
    setDeleteError("")
    try {
      await deleteAthlete(athleteId)
      // Atualiza a lista do seletor de atletas e limpa a seleção atual.
      await mutate("hub-athletes-picker")
      setConfirmingDelete(false)
      setAthleteId(undefined)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Não foi possível excluir a atleta.")
    } finally {
      setDeleting(false)
    }
  }

  const chapters = data ? buildChapters(data.entries) : []
  const overall = data ? aggregateFundamentals(data.entries.map((e) => e.stats)) : null
  const series = evolutionSeries(chapters)
  const { trend } = overallTrend(chapters)

  const last = chapters[chapters.length - 1]
  const prev = chapters[chapters.length - 2]

  // Último TGP registrado: participação nos pontos da equipe no capítulo mais
  // recente que possua o dado. Não entra no cálculo do IPTV.
  const lastTgpEntry = data
    ? [...data.entries]
        .reverse()
        .find((e) => e.tgp != null)
    : undefined
  const lastTgp = lastTgpEntry?.tgp ?? null

  const evaluation =
    data?.athlete && last
      ? generateEvaluation({
          athleteName: data.athlete.full_name,
          position: data.athlete.position || last.entries[0]?.position || "",
          current: last.fundamentals,
          previous: prev?.fundamentals,
        })
      : ""

  async function handlePDF() {
    if (!data?.athlete) return
    setExporting(true)
    try {
      await exportAthletePdf(data.athlete, data.entries)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Atleta</label>
          <AthletePicker value={athleteId} onChange={setAthleteId} />
        </div>
        {data?.athlete && chapters.length > 0 && (
          <Button onClick={handlePDF} disabled={exporting} className="gap-2">
            <FileDown className="size-4" />
            {exporting ? "Gerando..." : "Gerar PDF"}
          </Button>
        )}
      </div>

      {!athleteId && <EmptyState title="Selecione uma atleta" description="Escolha uma atleta para ver o perfil, a evolução e a avaliação inteligente." />}

      {athleteId && isLoading && <p className="text-sm text-muted-foreground">Carregando perfil...</p>}

      {athleteId && !isLoading && data?.athlete && chapters.length === 0 && (
        <EmptyState title="Sem histórico" description="Esta atleta ainda não possui capítulos de histórico importados." />
      )}

      {athleteId && !isLoading && data?.athlete && overall && chapters.length > 0 && (
        <>
          {/* Perfil */}
          <HubCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{data.athlete.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[data.athlete.position, data.athlete.category, data.athlete.team].filter(Boolean).join(" • ") ||
                    "Sem dados de posição"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <IptvBadge
                  value={computeIPTV(overall, data.athlete.position)}
                  trend={trend}
                  label="IPTV geral"
                />
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Excluir?</span>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Excluindo..." : "Sim, excluir"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmingDelete(true)}
                    aria-label="Excluir atleta"
                    title="Excluir atleta do histórico"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
            {deleteError && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
          </HubCard>

          {/* Último TGP — lido automaticamente do scout mais recente; não entra no IPTV */}
          <HubCard
            title="Último TGP"
            description="Participação nos pontos da equipe no scout mais recente. Atualizado automaticamente a cada novo scout. Não faz parte do cálculo do IPTV."
          >
            {lastTgp != null ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{lastTgp}%</span>
                {lastTgpEntry?.competition && (
                  <span className="text-sm text-muted-foreground">
                    {lastTgpEntry.competition}
                    {lastTgpEntry.season ? ` • ${lastTgpEntry.season}` : ""}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há TGP registrado. Ele será preenchido automaticamente no próximo scout importado.
              </p>
            )}
          </HubCard>

          {/* Evolução — gráfico */}
          <HubCard title="Evolução dos fundamentos" description="Percentual de aproveitamento por competição.">
            {series.length > 1 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {FUNDAMENTALS.map((key) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={FUNDAMENTAL_LABELS[key]}
                        stroke={FUND_COLORS[key]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                É necessário mais de uma competição para traçar a evolução ao longo do tempo.
              </p>
            )}
          </HubCard>

          {/* Evolução — indicadores por fundamento */}
          <HubCard title="Indicadores" description="Percentual atual e tendência entre a última e a penúltima competição.">
            <div className="divide-y divide-border">
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

          {/* Avaliação Inteligente */}
          <HubCard
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Avaliação Inteligente
              </span>
            }
            description="Texto gerado automaticamente a partir dos dados do scout e da posição."
          >
            <p className="text-pretty leading-relaxed text-foreground">{evaluation}</p>
          </HubCard>
        </>
      )}
    </div>
  )
}
