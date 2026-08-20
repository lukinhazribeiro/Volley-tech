"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { AthleteGrid } from "./athlete-grid"
import { HubCard, EmptyState } from "./ui"
import { Button } from "@/components/ui/button"
import { getAthlete, listEntriesForAthlete } from "@/lib/hub/data"
import { listAssessments } from "@/lib/hub/physical"
import { computeIGD } from "@/lib/hub/igd"
import { getGestaoAthlete, getGestaoClube, updateGestaoAthleteIdentity } from "@/app/volley-hub/actions/gestao-link"
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
  type VibCompareResult,
} from "@/lib/hub/vib"
import { compareVib, listVibHistory, saveVibHistory, syncVibSample, updateAthleteIdentity } from "@/lib/hub/vib-data"
import {
  Cake,
  ChevronLeft,
  Crown,
  Link2Off,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  VenusAndMars,
  X,
} from "lucide-react"

/** Opções de posição (rótulos reconhecidos por positionToGroup). */
const POSITION_OPTIONS = ["Levantadora", "Ponteira", "Oposta", "Central", "Líbero"]
/** Opções de gênero. */
const GENDER_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
]
function genderLabel(v: string | null): string | null {
  if (!v) return null
  return GENDER_OPTIONS.find((g) => g.value === v.toLowerCase())?.label ?? v
}

/** Tom semântico por faixa estatística (1 = topo, 4 = base). */
function bandTone(band: number): { text: string; bg: string; border: string; bar: string } {
  switch (band) {
    case 1:
      return { text: "text-blue-700", bg: "bg-blue-500/10", border: "border-blue-400/40", bar: "bg-blue-500" }
    case 2:
      return { text: "text-cyan-700", bg: "bg-cyan-500/10", border: "border-cyan-400/40", bar: "bg-cyan-500" }
    case 3:
      return { text: "text-amber-700", bg: "bg-amber-500/10", border: "border-amber-400/40", bar: "bg-amber-500" }
    default:
      return { text: "text-red-700", bg: "bg-red-500/10", border: "border-red-400/40", bar: "bg-red-500" }
  }
}

/** Rótulo curto da classificação por faixa (sem "Excelente", que é destaque). */
const BAND_TIER_LABEL: Record<number, string> = {
  1: "Muito Bom",
  2: "Bom",
  3: "Neutro",
  4: "Abaixo do esperado",
}

/** Identidade resolvida da atleta (após aplicar a fonte escolhida). */
interface ResolvedIdentity {
  birthDate: string | null
  sex: string | null
  position: string | null
  category: string | null
  club: string | null
}

export function VibAtleta({ initialAthleteId }: { initialAthleteId?: string }) {
  const [athleteId, setAthleteId] = useState<string | undefined>(initialAthleteId)
  const { mutate } = useSWRConfig()
  const refresh = () => mutate(["vib-atleta", athleteId])

  const { data, isLoading } = useSWR(athleteId ? ["vib-atleta", athleteId] : null, async () => {
    const [athlete, entries, assessments] = await Promise.all([
      getAthlete(athleteId!),
      listEntriesForAthlete(athleteId!),
      listAssessments(athleteId!),
    ])

    const linked = athlete?.gestao_atleta_id != null
    // Identidade vinda da Gestão (mesmo vínculo usado por IPTV/IPF/TGP) + clube da conta.
    const [gestao, gestaoClube] = await Promise.all([
      linked ? getGestaoAthlete(athlete!.gestao_atleta_id!) : Promise.resolve(null),
      getGestaoClube(),
    ])

    // Fonte da identidade: "sync" (padrão) usa a Gestão quando vinculada; "manual" usa a Hub.
    const source: "sync" | "manual" = athlete?.identity_source === "manual" ? "manual" : "sync"
    const syncing = source === "sync" && linked

    const identity: ResolvedIdentity = {
      birthDate: syncing ? (gestao?.dataNascimento ?? athlete?.birth_date ?? null) : (athlete?.birth_date ?? null),
      sex: syncing ? (gestao?.genero ?? athlete?.sex ?? null) : (athlete?.sex ?? null),
      position: syncing ? (gestao?.posicao ?? athlete?.position ?? null) : (athlete?.position ?? null),
      category: syncing ? (gestao?.categoria ?? athlete?.category ?? null) : (athlete?.category ?? null),
      club: syncing ? (gestaoClube ?? athlete?.club ?? null) : (athlete?.club ?? gestaoClube ?? null),
    }

    const parts = computeIGD(entries, assessments)
    const igd = parts.igd

    // Participação automática: mantém a amostra anônima em dia e compara.
    await syncVibSample({ athleteId: athleteId!, position: identity.position, birthDate: identity.birthDate, igd })
    const compare = await compareVib({ position: identity.position, birthDate: identity.birthDate, igd })
    const history = await listVibHistory(athleteId!)

    return { athlete, linked, source, syncing, identity, igd, compare, history }
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
  const identity = data?.identity
  const igd = data?.igd ?? null
  const compare = data?.compare ?? null
  const classification = classifyVib(compare)
  const age = ageFromBirthDate(identity?.birthDate)
  const group = positionToGroup(identity?.position)
  const groupLabel = POSITION_GROUP_LABEL[group]

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={() => setAthleteId(undefined)} className="gap-2 self-start px-2">
        <ChevronLeft className="size-4" />
        Todas as atletas
      </Button>

      {isLoading && <p className="text-sm text-[var(--hub-muted)]">Calculando VIB…</p>}

      {!isLoading && athlete && identity && (
        <>
          <IdentityStrip
            athleteId={athleteId}
            gestaoId={athlete.gestao_atleta_id}
            name={athlete.full_name}
            linked={data.linked}
            source={data.source}
            identity={identity}
            age={age}
            onRefresh={refresh}
          />

          {igd == null ? (
            <HubCard>
              <EmptyState
                title="Sem IGD ainda"
                description="Importe scouts ou cadastre avaliações físicas para gerar o IGD e, com ele, o VIB."
              />
            </HubCard>
          ) : !identity.birthDate || group === "outro" ? (
            <MissingIdentityNotice missingBirth={!identity.birthDate} missingPosition={group === "outro"} />
          ) : compare && compare.sampleSize > 0 ? (
            <>
              <VibHero
                classification={classification}
                igd={igd}
                band1Avg={band1Average(compare)}
                groupLabel={groupLabel}
                age={age}
                sampleSize={compare.sampleSize}
                excellent={compare.isExcellent}
              />

              <BandLadder compare={compare} igd={igd} />

              <div className="flex justify-end">
                <SaveHistoryButton
                  athleteId={athleteId}
                  season={String(currentSeason())}
                  classification={classification}
                  band={compare.isExcellent ? 1 : compare.band}
                  igd={igd}
                  band1Avg={band1Average(compare)}
                  sampleSize={compare.sampleSize}
                  onSaved={refresh}
                />
              </div>
            </>
          ) : (
            <HubCard>
              <EmptyState
                title="Base comparável ainda pequena"
                description="Assim que mais atletas da mesma posição e faixa etária tiverem IGD, o VIB desta atleta será calculado automaticamente."
              />
            </HubCard>
          )}

          {data.history.length > 0 && <HistoryTimeline history={data.history} />}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Identidade — sincronização automática (Gestão) OU edição manual     */
/* ------------------------------------------------------------------ */

function IdentityStrip({
  athleteId,
  gestaoId,
  name,
  linked,
  source,
  identity,
  age,
  onRefresh,
}: {
  athleteId: string
  gestaoId: number | null
  name: string
  linked: boolean
  source: "sync" | "manual"
  identity: ResolvedIdentity
  age: number | null
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const syncing = source === "sync" && linked

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  async function setSource(next: "sync" | "manual") {
    if (next === source) {
      if (next === "manual") setEditing(true)
      return
    }
    setBusy(true)
    try {
      await updateAthleteIdentity(athleteId, { identitySource: next })
      if (next === "manual") setEditing(true)
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-gradient-to-br from-[var(--hub-surface)] to-[var(--hub-bg-deep)] p-5">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--hub-accent)] text-lg font-bold text-black">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--hub-accent)]">Perfil da atleta</p>
          <h3 className="truncate text-xl font-bold text-[var(--hub-text)]">{name}</h3>
          <p className="truncate text-sm text-[var(--hub-muted)]">
            {[identity.position, identity.club].filter(Boolean).join(" • ") || "Sem posição definida"}
          </p>
        </div>
      </div>

      {/* Alternância de fonte da identidade */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-0.5">
          <button
            type="button"
            onClick={() => setSource("sync")}
            disabled={busy || !linked}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              syncing ? "bg-[var(--hub-accent)] text-black" : "text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            <RefreshCw className="size-3.5" /> Sincronizar Gestão
          </button>
          <button
            type="button"
            onClick={() => setSource("manual")}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              source === "manual" || !linked
                ? "bg-[var(--hub-accent)] text-black"
                : "text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            <Pencil className="size-3.5" /> Manual
          </button>
        </div>
        {busy && <Loader2 className="size-4 animate-spin text-[var(--hub-muted)]" />}
        {(source === "manual" || !linked) && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8 gap-1.5">
            <Pencil className="size-3.5" /> Editar identidade
          </Button>
        )}
      </div>

      {editing && (source === "manual" || !linked) ? (
        <IdentityEditor
          athleteId={athleteId}
          gestaoId={linked ? gestaoId : null}
          identity={identity}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            onRefresh()
          }}
        />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <IdentityChip icon={Shield} label="Categoria" value={identity.category} />
            <IdentityChip icon={Target} label="Posição" value={identity.position} />
            <IdentityChip icon={VenusAndMars} label="Gênero" value={genderLabel(identity.sex)} />
            <IdentityChip
              icon={Cake}
              label="Nascimento"
              value={identity.birthDate ? new Date(identity.birthDate).toLocaleDateString("pt-BR") : null}
            />
            <IdentityChip icon={Users} label="Idade" value={age != null ? `${age} anos` : null} />
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--hub-muted)]">
            {syncing ? (
              <>
                <Sparkles className="size-3 text-[var(--hub-accent)]" />
                Identidade sincronizada com o cadastro da Gestão. Para alterar, edite a atleta na Gestão ou mude para
                o modo manual.
              </>
            ) : linked ? (
              <>
                <Pencil className="size-3" />
                Modo manual: os dados abaixo são editados aqui e também atualizam o cadastro da Gestão vinculado.
              </>
            ) : (
              <>
                <Link2Off className="size-3" />
                Atleta sem vínculo com a Gestão — preencha a identidade manualmente ou vincule em IPTV/IPF.
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}

function IdentityChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[var(--hub-muted)]">
        <Icon className="size-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--hub-text)]">{value || "—"}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Editor manual da identidade (grava na Hub + write-back à Gestão)    */
/* ------------------------------------------------------------------ */

const editInput =
  "w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)] focus:border-[var(--hub-accent)] focus:outline-none"
const editLabel = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--hub-muted)]"

function IdentityEditor({
  athleteId,
  gestaoId,
  identity,
  onClose,
  onSaved,
}: {
  athleteId: string
  gestaoId: number | null
  identity: ResolvedIdentity
  onClose: () => void
  onSaved: () => void
}) {
  const [birthDate, setBirthDate] = useState(identity.birthDate ?? "")
  const [sex, setSex] = useState(identity.sex ?? "")
  const [position, setPosition] = useState(identity.position ?? "")
  const [club, setClub] = useState(identity.club ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      // Fixa a fonte como manual e grava a identidade na Hub.
      await updateAthleteIdentity(athleteId, {
        birthDate: birthDate || null,
        sex: sex || null,
        position: position || null,
        club: club || null,
        identitySource: "manual",
      })
      // Write-back cadastral para a Gestão vinculada (nascimento, gênero, posição).
      if (gestaoId != null) {
        await updateGestaoAthleteIdentity(gestaoId, {
          dataNascimento: birthDate || null,
          genero: sex || null,
          posicao: position || null,
        })
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar a identidade.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--hub-text)]">Editar identidade</p>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
          aria-label="Fechar edição"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={editLabel} htmlFor="vib-birth">Data de nascimento</label>
          <input id="vib-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={editInput} />
        </div>
        <div>
          <label className={editLabel} htmlFor="vib-sex">Gênero</label>
          <select id="vib-sex" value={sex} onChange={(e) => setSex(e.target.value)} className={editInput}>
            <option value="">Não informado</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={editLabel} htmlFor="vib-position">Posição</label>
          <select id="vib-position" value={position} onChange={(e) => setPosition(e.target.value)} className={editInput}>
            <option value="">Não informada</option>
            {POSITION_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={editLabel} htmlFor="vib-club">Clube</label>
          <input id="vib-club" value={club} onChange={(e) => setClub(e.target.value)} className={editInput} placeholder="Clube da atleta" />
        </div>
      </div>

      {gestaoId != null && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--hub-muted)]">
          <Sparkles className="size-3 text-[var(--hub-accent)]" />
          Nascimento, gênero e posição também serão atualizados no cadastro da Gestão vinculado.
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar identidade
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero — a classificação em destaque (carro-chefe)                    */
/* ------------------------------------------------------------------ */

function VibHero({
  classification,
  igd,
  band1Avg,
  groupLabel,
  age,
  sampleSize,
  excellent,
}: {
  classification: VibClassification
  igd: number
  band1Avg: number | null
  groupLabel: string
  age: number | null
  sampleSize: number
  excellent: boolean
}) {
  const tone = classificationTone(classification)
  const delta = band1Avg != null ? igd - band1Avg : null

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${tone.border} ${tone.bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--hub-muted)]">
            VIB • Volley Intelligence Band
          </p>
          <div className="mt-2 flex items-center gap-2">
            {excellent && <Crown className="size-6 text-emerald-600" />}
            <span className={`text-2xl font-black uppercase tracking-tight ${tone.text}`}>
              {VIB_CLASSIFICATION_LABEL[classification]}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--hub-muted)]">
            {groupLabel}
            {age != null ? ` • ${age} anos (±1)` : ""} • amostra {sampleSize}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-[var(--hub-muted)]">IGD</p>
          <p className="text-4xl font-black tabular-nums text-[var(--hub-accent)]">{igd}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]/70 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--hub-muted)]">Média da Faixa 1</p>
          <p className="text-lg font-bold tabular-nums text-[var(--hub-text)]">{band1Avg ?? "—"}</p>
        </div>
        {delta != null && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-[var(--hub-muted)]">Diferença</p>
            <p className={`text-lg font-bold tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Escada das 4 faixas — Faixa 1 (topo) → Faixa 4 (base)               */
/* ------------------------------------------------------------------ */

function BandLadder({ compare, igd }: { compare: VibCompareResult; igd: number }) {
  const bands = [1, 2, 3, 4]
  const athleteBand = compare.isExcellent ? 1 : compare.band

  return (
    <HubCard
      title="Escada estatística"
      description="A população comparável é ordenada pelo IGD e dividida em 4 faixas iguais. A média de cada faixa é dinâmica."
    >
      <div className="space-y-2">
        {compare.isExcellent && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-700">Excelente</p>
                <p className="text-[11px] text-emerald-700/80">Acima da média da Faixa 1</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">VOCÊ • {igd}</span>
          </div>
        )}

        {bands.map((b) => {
          const tone = bandTone(b)
          const avg = compare.bandAverages[b - 1]
          const isAthlete = athleteBand === b && !compare.isExcellent
          return (
            <div
              key={b}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                isAthlete ? `${tone.border} ${tone.bg}` : "border-[var(--hub-border)] bg-[var(--hub-bg-deep)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex size-8 items-center justify-center rounded-lg text-sm font-black text-white ${tone.bar}`}>
                  {b}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--hub-text)]">Faixa {b}</p>
                  <p className={`text-[11px] font-medium ${tone.text}`}>{BAND_TIER_LABEL[b]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--hub-muted)]">Média</p>
                  <p className="text-sm font-bold tabular-nums text-[var(--hub-text)]">{avg ?? "—"}</p>
                </div>
                {isAthlete && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${tone.bar}`}>VOCÊ • {igd}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </HubCard>
  )
}

/* ------------------------------------------------------------------ */
/* Histórico do VIB por temporada                                      */
/* ------------------------------------------------------------------ */

function HistoryTimeline({
  history,
}: {
  history: {
    season: string
    classification: VibClassification
    athleteIgd: number
  }[]
}) {
  return (
    <HubCard title="Evolução do VIB" description="Classificação registrada por temporada.">
      <div className="space-y-2">
        {history.map((h) => {
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
  )
}

/* ------------------------------------------------------------------ */
/* Aviso de identidade incompleta                                      */
/* ------------------------------------------------------------------ */

function MissingIdentityNotice({
  missingBirth,
  missingPosition,
}: {
  missingBirth: boolean
  missingPosition: boolean
}) {
  const faltando = [missingBirth ? "data de nascimento" : null, missingPosition ? "posição" : null]
    .filter(Boolean)
    .join(" e ")
  return (
    <HubCard>
      <EmptyState
        title="Faltam dados para o VIB"
        description={`Para comparar a atleta o VIB precisa de ${faltando}. Sincronize com a Gestão (nascimento, gênero e posição) ou use o modo manual acima para preencher.`}
      />
    </HubCard>
  )
}

/* ------------------------------------------------------------------ */
/* Botão de registrar no histórico                                     */
/* ------------------------------------------------------------------ */

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
