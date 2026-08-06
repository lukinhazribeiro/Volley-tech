"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { AthletePicker } from "./athlete-picker"
import { HubCard, IptvBadge, EmptyState } from "./ui"
import { getAthlete } from "@/lib/hub/data"
import {
  listAssessments,
  createAssessment,
  deleteAssessment,
  computeIPF,
  averageIPF,
  ipfSeries,
  PHYSICAL_METRICS,
  type NewAssessment,
} from "@/lib/hub/physical"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Dumbbell } from "lucide-react"

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function IpfAtleta({ initialAthleteId }: { initialAthleteId?: string }) {
  const [athleteId, setAthleteId] = useState<string | undefined>(initialAthleteId)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const { data, isLoading, mutate } = useSWR(
    athleteId ? ["ipf-atleta", athleteId] : null,
    async () => {
      const [athlete, assessments] = await Promise.all([
        getAthlete(athleteId!),
        listAssessments(athleteId!),
      ])
      return { athlete, assessments }
    },
  )

  const assessments = data?.assessments ?? []
  const avg = averageIPF(assessments)
  const series = ipfSeries(assessments)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!athleteId) return
    setSaving(true)
    setError("")
    try {
      const form = new FormData(e.currentTarget)
      const input: NewAssessment = {
        athlete_id: athleteId,
        assessment_date: (form.get("assessment_date") as string) || todayISO(),
        notes: (form.get("notes") as string) || null,
      }
      for (const def of PHYSICAL_METRICS) {
        const raw = form.get(def.key) as string
        input[def.key] = raw?.trim() ? Number(raw) : null
      }
      await createAssessment(input)
      await mutate()
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a avaliação.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteAssessment(id)
    await mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label className="mb-1.5 block text-sm font-medium text-[var(--hub-muted)]">Atleta</label>
          <AthletePicker value={athleteId} onChange={setAthleteId} />
        </div>
        {athleteId && data?.athlete && (
          <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
            <Plus className="size-4" />
            Nova avaliação
          </Button>
        )}
      </div>

      {!athleteId && (
        <EmptyState
          title="Selecione uma atleta"
          description="Escolha uma atleta para ver o histórico físico e cadastrar avaliações."
        />
      )}

      {athleteId && isLoading && <p className="text-sm text-[var(--hub-muted)]">Carregando avaliações...</p>}

      {athleteId && !isLoading && data?.athlete && (
        <>
          {/* Perfil + índice físico geral */}
          <HubCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--hub-text)]">{data.athlete.full_name}</h2>
                <p className="text-sm text-[var(--hub-muted)]">
                  {[data.athlete.position, data.athlete.category, data.athlete.team].filter(Boolean).join(" • ") ||
                    "Sem dados de posição"}
                </p>
              </div>
              {avg != null && <IptvBadge value={avg} label="IPF geral" />}
            </div>
          </HubCard>

          {/* Formulário de nova avaliação */}
          {showForm && (
            <HubCard
              title={
                <span className="flex items-center gap-2">
                  <Dumbbell className="size-4 text-[var(--hub-accent)]" />
                  Nova avaliação física
                </span>
              }
              description="Preencha apenas as medidas que possuir. O índice usa as métricas pontuáveis informadas."
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--hub-muted)]" htmlFor="assessment_date">
                    Data da avaliação
                  </label>
                  <input
                    id="assessment_date"
                    name="assessment_date"
                    type="date"
                    defaultValue={todayISO()}
                    className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 py-2 text-sm text-[var(--hub-text)] sm:max-w-xs"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PHYSICAL_METRICS.map((def) => (
                    <div key={def.key}>
                      <label className="mb-1 block text-xs font-medium text-[var(--hub-muted)]" htmlFor={def.key}>
                        {def.label} <span className="text-[var(--hub-muted)]/70">({def.unit})</span>
                      </label>
                      <input
                        id={def.key}
                        name={def.key}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="—"
                        className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 py-2 text-sm text-[var(--hub-text)]"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--hub-muted)]" htmlFor="notes">
                    Observações
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 py-2 text-sm text-[var(--hub-text)]"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar avaliação"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </HubCard>
          )}

          {assessments.length === 0 && !showForm && (
            <EmptyState
              title="Sem avaliações físicas"
              description="Cadastre a primeira avaliação para começar a acompanhar a evolução física."
            />
          )}

          {/* Linha do tempo / evolução física */}
          {series.length > 1 && (
            <HubCard title="Evolução física" description="Índice de Performance Física (IPF) ao longo do tempo.">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--hub-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--hub-muted)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--hub-muted)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--hub-surface)",
                        border: "1px solid var(--hub-border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--hub-text)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ipf"
                      name="IPF"
                      stroke="var(--hub-accent)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </HubCard>
          )}

          {/* Histórico de avaliações */}
          {assessments.length > 0 && (
            <HubCard title="Histórico de avaliações" description="Todas as avaliações físicas registradas.">
              <div className="space-y-3">
                {[...assessments].reverse().map((a) => {
                  const ipf = computeIPF(a)
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--hub-text)]">
                          {new Date(a.assessment_date).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="truncate text-xs text-[var(--hub-muted)]">
                          {PHYSICAL_METRICS.filter((d) => a[d.key] != null)
                            .map((d) => `${d.label}: ${a[d.key]}${d.unit}`)
                            .join(" · ") || "Sem medidas"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {ipf != null && (
                          <span className="rounded-lg bg-[var(--hub-surface)] px-3 py-1 text-sm font-semibold tabular-nums text-[var(--hub-accent)]">
                            IPF {ipf}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(a.id)}
                          aria-label="Excluir avaliação"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </HubCard>
          )}
        </>
      )}
    </div>
  )
}
