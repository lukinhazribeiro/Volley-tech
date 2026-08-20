"use client"

import { useEffect, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { AthleteGrid } from "./athlete-grid"
import { HubCard, EmptyState } from "./ui"
import { Button } from "@/components/ui/button"
import { getAthlete, listEntriesForAthlete } from "@/lib/hub/data"
import { listAssessments } from "@/lib/hub/physical"
import { computeIGD } from "@/lib/hub/igd"
import { getGestaoAthlete, getClubeNome } from "@/app/volley-hub/actions/gestao-link"
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
import {
  compareVib,
  listVibHistory,
  saveVibHistory,
  syncVibSample,
  updateAthleteIdentity,
} from "@/lib/hub/vib-data"
import {
  Cake,
  ChevronLeft,
  Crown,
  Link2,
  Link2Off,
  Pencil,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Venus,
  X,
} from "lucide-react"

type IdentityMode = "auto" | "manual"

const POSITION_OPTIONS = ["Levantadora", "Ponteira", "Oposta", "Central", "Líbero"]
const SEX_LABEL: Record<string, string> = { feminino: "Feminino", masculino: "Masculino" }

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

const BAND_TIER_LABEL: Record<number, string> = {
  1: "Muito Bom",
  2: "Bom",
  3: "Neutro",
  4: "Abaixo do esperado",
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

    // Vínculo com a Gestão (mesma ponte usada por IPTV/IPF/TGP) + clube da conta.
    const [gestao, clubeNome] = await Promise.all([
      athlete?.gestao_atleta_id != null ? getGestaoAthlete(athlete.gestao_atleta_id) : Promise.resolve(null),
      getClubeNome(),
    ])

    const mode: IdentityMode = (athlete?.identity_mode as IdentityMode) ?? "auto"

    // Identidade efetiva conforme o modo escolhido.
    const identity =
      mode === "auto"
        ? {
            birthDate: gestao?.dataNascimento ?? athlete?.birth_date ?? null,
            sex: gestao?.genero ?? athlete?.sex ?? null,
            category: gestao?.categoria ?? athlete?.category ?? null,
            club: clubeNome ?? athlete?.club ?? athlete?.team ?? null,
            position: athlete?.position ?? null,
          }
        : {
            birthDate: athlete?.birth_date ?? null,
            sex: athlete?.sex ?? null,
            category: athlete?.category ?? null,
            club: athlete?.club ?? athlete?.team ?? null,
            position: athlete?.position ?? null,
          }

    // No modo automático, persiste a identidade da Gestão na Hub para manter
    // tudo coerente (a "informação boa" também fica salva no perfil).
    if (mode === "auto" && athlete) {
      const drift =
        (identity.birthDate ?? null) !== (athlete.birth_date ?? null) ||
        (identity.sex ?? null) !== (athlete.sex ?? null) ||
        (identity.club ?? null) !== (athlete.club ?? null) ||
        (identity.category ?? null) !== (athlete.category ?? null)
      if (drift) {
        try {
          await updateAthleteIdentity(athlete.id, {
            birthDate: identity.birthDate,
            sex: identity.sex,
            club: identity.club,
            category: identity.category,
          })
        } catch {
          // não bloqueia o cálculo do VIB
        }
      }
    }

    const parts = computeIGD(entries, assessments)
    const igd = parts.igd

    await syncVibSample({
      athleteId: athleteId!,
      position: identity.position,
      birthDate: identity.birthDate,
      igd,
    })
    const compare = await compareVib({ position: identity.position, birthDate: identity.birthDate, igd })
    const history = await listVibHistory(athleteId!)

    return { athlete, gestao, mode, identity, igd, compare, history }
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
  const identity = data?.identity
  const birthDate = identity?.birthDate ?? null
  const age = ageFromBirthDate(birthDate)
  const group = positionToGroup(identity?.position)
  const groupLabel = POSITION_GROUP_LABEL[group]
  const mode: IdentityMode = data?.mode ?? "auto"
  const linkedToGestao = athlete?.gestao_atleta_id != null

  const refresh = () => mutate(["vib-atleta", athleteId])

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={() => setAthleteId(undefined)} className="gap-2 self-start px-2">
        <ChevronLeft className="size-4" />
        Todas as atletas
      </Button>

      {isLoading && <p className="text-sm text-[var(--hub-muted)]">Calculando VIB…</p>}

      {!isLoading && athlete && identity && (
        <>
          <IdentityPanel
            athleteId={athlete.id}
            name={athlete.full_name}
            mode={mode}
            club={identity.club}
            category={identity.category}
            position={identity.position}
            sex={identity.sex}
            birthDate={birthDate}
            age={age}
            linkedToGestao={linkedToGestao}
            onChanged={refresh}
          />

          {igd == null ? (
            <HubCard>
              <EmptyState
                title="Sem IGD ainda"
                description="Importe scouts ou cadastre avaliações físicas para gerar o IGD e, com ele, o VIB."
              />
            </HubCard>
          ) : !birthDate || group === "outro" ? (
            <MissingIdentityNotice missingBirth={!birthDate} missingPosition={group === "outro"} mode={mode} />
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

          {data && data.history.length > 0 && <HistoryTimeline history={data.history} />}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Identidade — modo Automático (Gestão) ou Manual (editável)          */
/* ------------------------------------------------------------------ */

function IdentityPanel({
  athleteId,
  name,
  mode,
  club,
  category,
  position,
  sex,
  birthDate,
  age,
  linkedToGestao,
  onChanged,
}: {
  athleteId: string
  name: string
  mode: IdentityMode
  club: string | null
  category: string | null
  position: string | null
  sex: string | null
  birthDate: string | null
  age: number | null
  linkedToGestao: boolean
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  async function switchMode(next: IdentityMode) {
    if (next === mode || busy) return
    setBusy(true)
    try {
      await updateAthleteIdentity(athleteId, { identityMode: next })
      if (next === "manual") setEditing(true)
      onChanged()
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
            {[position, club].filter(Boolean).join(" • ") || "Sem posição definida"}
          </p>
        </div>
      </div>

      {/* Alternância de modo: Automático x Manual */}
      <div className="mt-4 flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] p-0.5">
          <ModeTab active={mode === "auto"} onClick={() => switchMode("auto")} disabled={busy}>
            <RefreshCw className="size-3.5" />
            Automático
          </ModeTab>
          <ModeTab active={mode === "manual"} onClick={() => switchMode("manual")} disabled={busy}>
            <Pencil className="size-3.5" />
            Manual
          </ModeTab>
        </div>
        {mode === "manual" && !editing && (
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      {editing && mode === "manual" ? (
        <ManualIdentityForm
          athleteId={athleteId}
          initial={{ birthDate, sex, position, club, category }}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            onChanged()
          }}
        />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <IdentityChip icon={Shield} label="Categoria" value={category} />
            <IdentityChip icon={Target} label="Posição" value={position} />
            <IdentityChip icon={Venus} label="Gênero" value={sex ? (SEX_LABEL[sex] ?? sex) : null} />
            <IdentityChip
              icon={Cake}
              label="Nascimento"
              value={birthDate ? new Date(birthDate).toLocaleDateString("pt-BR") : null}
            />
            <IdentityChip icon={Users} label="Idade" value={age != null ? `${age} anos` : null} />
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--hub-muted)]">
            {mode === "auto" ? (
              linkedToGestao ? (
                <>
                  <Sparkles className="size-3 text-[var(--hub-accent)]" />
                  Identidade sincronizada com o cadastro da Gestão (nascimento, gênero, categoria) e o clube da conta.
                </>
              ) : (
                <>
                  <Link2Off className="size-3" />
                  Sem vínculo com a Gestão. Vincule a atleta em IPTV/IPF, ou use o modo Manual para preencher aqui.
                </>
              )
            ) : (
              <>
                <Link2 className="size-3 text-[var(--hub-accent)]" />
                Identidade definida manualmente neste perfil, independente da Gestão.
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        active
          ? "bg-[var(--hub-accent)] text-black"
          : "text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
      }`}
    >
      {children}
    </button>
  )
}

function ManualIdentityForm({
  athleteId,
  initial,
  onCancel,
  onSaved,
}: {
  athleteId: string
  initial: { birthDate: string | null; sex: string | null; position: string | null; club: string | null; category: string | null }
  onCancel: () => void
  onSaved: () => void
}) {
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "")
  const [sex, setSex] = useState(initial.sex ?? "")
  const [position, setPosition] = useState(initial.position ?? "")
  const [club, setClub] = useState(initial.club ?? "")
  const [category, setCategory] = useState(initial.category ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateAthleteIdentity(athleteId, {
        birthDate: birthDate || null,
        sex: sex || null,
        position: position || null,
        club: club || null,
        category: category || null,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const fieldCls =
    "w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)] px-3 py-2 text-sm text-[var(--hub-text)] focus:border-[var(--hub-accent)] focus:outline-none"
  const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--hub-muted)]"

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]/60 p-4 sm:grid-cols-2">
      <div>
        <label className={labelCls} htmlFor="vib-birth">Data de nascimento</label>
        <input id="vib-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="vib-sex">Gênero</label>
        <select id="vib-sex" value={sex} onChange={(e) => setSex(e.target.value)} className={fieldCls}>
          <option value="">Não informado</option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="vib-position">Posição</label>
        <select id="vib-position" value={position} onChange={(e) => setPosition(e.target.value)} className={fieldCls}>
          <option value="">Não informada</option>
          {POSITION_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="vib-category">Categoria</label>
        <input id="vib-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Sub-15" className={fieldCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor="vib-club">Clube atual</label>
        <input id="vib-club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nome do clube" className={fieldCls} />
      </div>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="gap-1.5">
          <X className="size-4" /> Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
          <Save className="size-4" /> {saving ? "Salvando…" : "Salvar identidade"}
        </Button>
      </div>
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
  mode,
}: {
  missingBirth: boolean
  missingPosition: boolean
  mode: IdentityMode
}) {
  const faltando = [missingBirth ? "data de nascimento" : null, missingPosition ? "posição" : null]
    .filter(Boolean)
    .join(" e ")
  const hint =
    mode === "auto"
      ? "Esses dados vêm da Gestão (nascimento/gênero) e da posição da atleta. Complete o cadastro na Gestão ou troque para o modo Manual e preencha aqui."
      : "Preencha esses campos no modo Manual (botão Editar acima) para calcular o VIB."
  return (
    <HubCard>
      <EmptyState title="Faltam dados para o VIB" description={`Para comparar a atleta o VIB precisa de ${faltando}. ${hint}`} />
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

  // Reabilita o registro quando a temporada/classificação muda.
  useEffect(() => {
    setSaved(false)
  }, [season, classification, igd])

  async function save() {
    setSaving(true)
    try {
      await saveVibHistory({ athleteId, season, classification, band, athleteIgd: igd, band1Avg, sampleSize })
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
