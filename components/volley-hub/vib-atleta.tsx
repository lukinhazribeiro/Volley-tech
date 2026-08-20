"use client"

import type React from "react"
import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { AthleteGrid } from "./athlete-grid"
import { HubCard, EmptyState } from "./ui"
import { Button } from "@/components/ui/button"
import { getAthlete, listEntriesForAthlete } from "@/lib/hub/data"
import { listAssessments } from "@/lib/hub/physical"
import { computeIGD } from "@/lib/hub/igd"
import {
  ageFromBirthDate,
  band1Average,
  classificationTone,
  classifyVib,
  currentSeason,
  POSITION_GROUP_LABEL,
  positionToGroup,
  VIB_CLASSIFICATION_LABEL,
  type VibClassification,
} from "@/lib/hub/vib"
import {
  compareVib,
  listVibHistory,
  saveVibHistory,
  syncVibSample,
  updateAthleteIdentity,
} from "@/lib/hub/vib-data"
import { ChevronLeft, Save, Sparkles, TrendingUp } from "lucide-react"

/** Barra visual das 4 faixas, destacando a faixa atual da atleta. */
function BandStrip({ band, excellent }: { band: number; excellent: boolean }) {
  // Exibe da Faixa 4 (base) para a Faixa 1 (topo), como no mockup.
  const bands = [4, 3, 2, 1]
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {bands.map((b) => {
          const active = b === band && !excellent
          return (
            <div
              key={b}
              className={`flex-1 rounded-lg border p-2 text-center text-xs font-semibold transition-colors ${
                active
                  ? "border-[var(--hub-accent)] bg-[var(--hub-accent)] text-black"
                  : "border-[var(--hub-border)] bg-[var(--hub-bg-deep)] text-[var(--hub-muted)]"
              }`}
            >
              Faixa {b}
            </div>
          )
        })}
      </div>
      {excellent && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100 py-2 text-sm font-bold text-emerald-700">
          <Sparkles className="size-4" />
          EXCELENTE — acima da média da Faixa 1
        </div>
      )}
    </div>
  )
}

/** Selo grande da classificação VIB. */
function ClassificationBadge({ c }: { c: VibClassification }) {
  const tone = classificationTone(c)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${tone.text} ${tone.bg} ${tone.border}`}
    >
      {VIB_CLASSIFICATION_LABEL[c]}
    </span>
  )
}

export function VibAtleta({ initialAthleteId }: { initialAthleteId?: string }) {
  const [athleteId, setAthleteId] = useState<string | undefined>(initialAthleteId)
  const { mutate } = useSWRConfig()

  const { data, isLoading } = useSWR(athleteId ? ["vib-atleta", athleteId] : null, async () => {
    const [athlete, entries, assessments] = await Promise.all([
      getAthlete(athleteId!),
      listEntriesForAthlete(athleteId!),
      listAssessments(athleteId!),
    ])
    const parts = computeIGD(entries, assessments)
    const igd = parts.igd

    // Mantém a amostra anônima em dia (participação automática) e compara.
    await syncVibSample({
      athleteId: athleteId!,
      position: athlete?.position ?? null,
      birthDate: athlete?.birth_date ?? null,
      igd,
    })
    const compare = await compareVib({
      position: athlete?.position ?? null,
      birthDate: athlete?.birth_date ?? null,
      igd,
    })
    const history = await listVibHistory(athleteId!)
    return { athlete, igd, compare, history }
  })

  if (!athleteId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--hub-text)]">Atletas registradas</h2>
          <p className="text-sm text-[var(--hub-muted)]">
            Clique numa atleta para ver o VIB — a referência estatística do IGD frente a atletas semelhantes.
          </p>
        </div>
        <AthleteGrid onSelect={setAthleteId} />
      </div>
    )
  }

  const athlete = data?.athlete
  const igd = data?.igd ?? null
  const compare = data?.compare ?? null
  const classification = classifyVib(compare)
  const age = ageFromBirthDate(athlete?.birth_date)
  const group = positionToGroup(athlete?.position)
  const groupLabel = POSITION_GROUP_LABEL[group]

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setAthleteId(undefined)} className="gap-2 self-start px-2">
        <ChevronLeft className="size-4" />
        Todas as atletas
      </Button>

      {isLoading && <p className="text-sm text-[var(--hub-muted)]">Calculando VIB…</p>}

      {!isLoading && athlete && (
        <>
          {/* Identidade da atleta (editável, vinculada ao perfil) */}
          <IdentityCard athleteId={athleteId} athlete={athlete} igd={igd} onSaved={() => mutate(["vib-atleta", athleteId])} />

          {/* Bloco VIB */}
          <HubCard
            title="VIB — Volley Intelligence Band"
            description="Referência estatística dinâmica: compara o IGD da atleta com atletas semelhantes (mesma posição e faixa etária). Nenhum dado individual de outras contas é exibido."
          >
            {igd == null ? (
              <EmptyState
                title="Sem IGD ainda"
                description="Importe scouts ou cadastre avaliações físicas para gerar o IGD e, com ele, o VIB."
              />
            ) : compare && compare.sampleSize > 0 ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">Classificação</p>
                    <div className="mt-1">
                      <ClassificationBadge c={classification} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">Grupo de comparação</p>
                    <p className="text-sm font-medium text-[var(--hub-text)]">
                      {groupLabel}{age != null ? ` — ${age} anos (±1)` : ""}
                    </p>
                    <p className="text-xs text-[var(--hub-muted)]">Amostra: {compare.sampleSize} atletas</p>
                  </div>
                </div>

                <BandStrip band={compare.band} excellent={compare.isExcellent} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">IGD da atleta</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--hub-accent)]">{igd}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">Média da Faixa 1</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--hub-text)]">
                      {band1Average(compare) ?? "—"}
                    </p>
                  </div>
                </div>

                <SaveHistoryButton
                  athleteId={athleteId}
                  season={String(currentSeason())}
                  classification={classification}
                  band={compare.isExcellent ? 1 : compare.band}
                  igd={igd}
                  band1Avg={band1Average(compare)}
                  sampleSize={compare.sampleSize}
                  onSaved={() => mutate(["vib-atleta", athleteId])}
                />
              </div>
            ) : (
              <EmptyState
                title="Base comparável ainda pequena"
                description="Assim que mais atletas da mesma posição e faixa etária tiverem IGD, o VIB desta atleta será calculado."
              />
            )}
          </HubCard>

          {/* Histórico do VIB por temporada */}
          {data && data.history.length > 0 && (
            <HubCard title="Evolução do VIB" description="Classificação registrada por temporada.">
              <div className="space-y-2">
                {data.history.map((h) => {
                  const tone = classificationTone(h.classification)
                  return (
                    <div
                      key={h.season}
                      className="flex items-center justify-between rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-[var(--hub-muted)]" />
                        <span className="text-sm font-medium text-[var(--hub-text)]">{h.season}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--hub-muted)]">IGD {h.athleteIgd}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.text} ${tone.bg}`}>
                          {VIB_CLASSIFICATION_LABEL[h.classification]}
                        </span>
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

/** Card de identidade da atleta, com edição inline de nascimento/sexo/clube. */
function IdentityCard({
  athleteId,
  athlete,
  igd,
  onSaved,
}: {
  athleteId: string
  athlete: { full_name: string; birth_date: string | null; sex: string | null; club: string | null; category: string | null; position: string | null }
  igd: number | null
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [birthDate, setBirthDate] = useState(athlete.birth_date ?? "")
  const [sex, setSex] = useState(athlete.sex ?? "")
  const [club, setClub] = useState(athlete.club ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const age = ageFromBirthDate(birthDate || athlete.birth_date)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateAthleteIdentity(athleteId, {
        birthDate: birthDate || null,
        sex: sex || null,
        club: club || null,
      })
      setEditing(false)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <HubCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--hub-accent)]">Perfil da atleta</p>
          <h3 className="mt-1 text-xl font-bold text-[var(--hub-text)]">{athlete.full_name}</h3>
        </div>
        {igd != null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">IGD</p>
            <p className="text-3xl font-bold tabular-nums text-[var(--hub-accent)]">{igd}</p>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Field label="Clube" value={athlete.club} />
          <Field label="Nascimento" value={athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString("pt-BR") : null} />
          <Field label="Idade" value={age != null ? `${age} anos` : null} />
          <Field label="Sexo" value={athlete.sex} />
          <Field label="Categoria" value={athlete.category} />
          <Field label="Posição" value={athlete.position} />
          <div className="col-span-2 mt-2 sm:col-span-3">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Editar identidade
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="vib-birth" className="text-xs font-medium text-[var(--hub-muted)]">
                Data de nascimento
              </label>
              <input
                id="vib-birth"
                type="date"
                value={birthDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="vib-sex" className="text-xs font-medium text-[var(--hub-muted)]">
                Sexo
              </label>
              <input
                id="vib-sex"
                value={sex}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSex(e.target.value)}
                placeholder="F / M"
                className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="vib-club" className="text-xs font-medium text-[var(--hub-muted)]">
                Clube atual
              </label>
              <input
                id="vib-club"
                value={club}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClub(e.target.value)}
                placeholder="Clube"
                className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </HubCard>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--hub-muted)]">{label}</p>
      <p className="font-medium text-[var(--hub-text)]">{value || "—"}</p>
    </div>
  )
}

/** Botão que registra a classificação atual no histórico da temporada. */
function SaveHistoryButton({
  athleteId,
  season,
  classification,
  band,
  igd,
  band1Avg,
  sampleSize,
  onSaved,
}: {
  athleteId: string
  season: string
  classification: VibClassification
  band: number
  igd: number
  band1Avg: number | null
  sampleSize: number
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await saveVibHistory({
        athleteId,
        season,
        classification,
        band,
        athleteIgd: igd,
        band1Avg,
        sampleSize,
      })
      setSaved(true)
      onSaved()
    } catch {
      // erro silencioso: histórico é complementar
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={save} disabled={saving || saved} className="gap-2">
      <Save className="size-4" />
      {saved ? `Registrado em ${season}` : saving ? "Registrando…" : `Registrar VIB de ${season}`}
    </Button>
  )
}
