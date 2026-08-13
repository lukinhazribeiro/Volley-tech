"use client"

import { useEffect, useRef, useState } from "react"
import { X, CheckCircle2, AlertTriangle, Loader2, UserPlus, Calendar } from "lucide-react"
import {
  buildCandidatesFromLocalMatches,
  buildCandidatesFromVideoMatches,
  buildCandidatesFromActionMatches,
  groupCandidatesByAthlete,
  listLocalImportMatches,
  listVideoImportMatches,
  listActionImportMatches,
  matchCandidates,
  createAthlete,
  saveAlias,
  insertHistoryEntries,
  logImport,
  type ImportableMatch,
} from "@/lib/hub/data"
import type { StoredMatch } from "@/lib/scout/match-storage"
import type { MatchHistoryEntry } from "@/lib/video-scout/history"
import type { ScoutActionMatch } from "@/lib/scout-action/types"
import { parseVHA, importVHA } from "@/lib/hub/vha"
import type { ImportCandidate, MatchResult } from "@/lib/hub/types"

type Mode = "local" | "video" | "action" | "vha"
type Phase = "loading" | "pick-matches" | "review" | "vha-pick" | "saving" | "done" | "error"

const MODE_LABEL: Record<Mode, string> = {
  local: "Importar do Scout Volleyball",
  video: "Importar do Scout View IA",
  action: "Importar do Scout Action",
  vha: "Importar arquivo .vha",
}

export function ImportWizard({
  mode,
  onClose,
  onDone,
}: {
  mode: Mode
  onClose: () => void
  onDone: () => void
}) {
  const [phase, setPhase] = useState<Phase>(mode === "vha" ? "vha-pick" : "loading")
  const [matchItems, setMatchItems] = useState<ImportableMatch[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<MatchResult[]>([])
  // Decisão do usuário por índice: athleteId escolhido, "new" ou "skip".
  const [decisions, setDecisions] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [summary, setSummary] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Guarda os dados brutos das partidas para montar os candidatos ao confirmar.
  const localMatchesRef = useRef<StoredMatch[]>([])
  const videoEntriesRef = useRef<MatchHistoryEntry[]>([])
  const actionMatchesRef = useRef<ScoutActionMatch[]>([])
  // Capítulos (um por jogo) de cada atleta, alinhado por índice com `results`.
  const groupsRef = useRef<ImportCandidate[][]>([])

  // Carrega a lista de jogos salvos para o usuário escolher o que importar.
  useEffect(() => {
    if (mode === "vha") return
    ;(async () => {
      try {
        if (mode === "local") {
          const { matches, items } = listLocalImportMatches()
          localMatchesRef.current = matches
          setMatchItems(items)
        } else if (mode === "action") {
          const { matches, items } = listActionImportMatches()
          actionMatchesRef.current = matches
          setMatchItems(items)
        } else {
          const { entries, items } = await listVideoImportMatches()
          videoEntriesRef.current = entries
          setMatchItems(items)
        }
        setPhase("pick-matches")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao ler os jogos salvos.")
        setPhase("error")
      }
    })()
  }, [mode])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      if (prev.size === matchItems.length) return new Set()
      return new Set(matchItems.map((m) => m.id))
    })
  }

  // Da seleção de jogos, monta os candidatos e roda a associação inteligente.
  async function handleContinueFromPick() {
    setPhase("loading")
    try {
      let candidates: ImportCandidate[]
      if (mode === "local") {
        const selected = localMatchesRef.current.filter((m) => selectedIds.has(m.id))
        candidates = buildCandidatesFromLocalMatches(selected)
      } else if (mode === "action") {
        const selected = actionMatchesRef.current.filter((m) => selectedIds.has(m.id))
        candidates = buildCandidatesFromActionMatches(selected)
      } else {
        const selected = videoEntriesRef.current.filter((e) => selectedIds.has(e.id))
        candidates = buildCandidatesFromVideoMatches(selected)
      }

      if (candidates.length === 0) {
        setError(
          mode === "video"
            ? "Os jogos selecionados não têm atletas com nome. Preencha os nomes do elenco no Scout View IA antes de importar."
            : mode === "action"
              ? "Os jogos selecionados não têm atletas com nome e ações registradas. Cadastre o elenco ao iniciar a coleta no Scout Action."
              : "Os jogos selecionados não têm atletas com nome. Cadastre os nomes do elenco ao configurar a partida no Scout Volleyball.",
        )
        setPhase("error")
        return
      }

      // Agrupa por atleta (um por jogador, com todos os capítulos) para nunca
      // duplicar quando o mesmo jogador aparece em vários jogos.
      const groups = groupCandidatesByAthlete(candidates)
      groupsRef.current = groups.map((g) => g.entries)

      const matched = await matchCandidates(groups.map((g) => g.representative))
      setResults(matched)
      const initial: Record<number, string> = {}
      matched.forEach((r, i) => {
        if (r.status === "exact") initial[i] = r.athleteId!
        else if (r.status === "new") initial[i] = "new"
        else initial[i] = ""
      })
      setDecisions(initial)
      setPhase("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao preparar a importação.")
      setPhase("error")
    }
  }

  const pendingAmbiguous = results.some((r, i) => r.status === "ambiguous" && !decisions[i])

  async function handleConfirmLocal() {
    setPhase("saving")
    try {
      const source = mode === "video" ? "scout_video" : mode === "action" ? "scout_action" : "scout_local"
      // Dedup por nome dentro do próprio lote: garante UMA atleta por nome mesmo
      // quando várias linhas "novas" têm o mesmo nome.
      const createdByName = new Map<string, string>()
      let inserted = 0
      let athletesTouched = 0

      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        const decision = decisions[i]
        if (decision === "skip" || !decision) continue

        const nameKey = r.candidate.fullName.trim().toLowerCase()
        let athleteId: string
        if (decision === "new") {
          const reused = createdByName.get(nameKey)
          if (reused) {
            athleteId = reused
          } else {
            athleteId = await createAthlete({
              fullName: r.candidate.fullName,
              team: r.candidate.team,
              category: r.candidate.category,
              position: r.candidate.position,
            })
            createdByName.set(nameKey, athleteId)
          }
        } else {
          athleteId = decision
        }

        // Grava a associação aprendida (para nunca repetir).
        await saveAlias({
          athleteId,
          fullName: r.candidate.fullName,
          team: r.candidate.team,
          category: r.candidate.category,
        })

        // Insere TODOS os capítulos (um por jogo) desta atleta.
        const entries = groupsRef.current[i] ?? [r.candidate]
        inserted += await insertHistoryEntries(entries.map((candidate) => ({ athleteId, candidate, source })))
        athletesTouched++
      }

      const originLabel =
        mode === "video" ? "Scout View IA" : mode === "action" ? "Scout Action" : "Scout Volleyball"
      await logImport(mode, `${originLabel} (${athletesTouched} atleta(s))`, inserted)
      setSummary(
        inserted > 0
          ? `${inserted} capítulo(s) adicionado(s) para ${athletesTouched} atleta(s).`
          : "Nada novo para importar — esses scouts já estavam no histórico.",
      )
      setPhase("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar a importação.")
      setPhase("error")
    }
  }

  async function handleVHAFile(file: File) {
    setPhase("saving")
    try {
      const vha = await parseVHA(file)
      const res = await importVHA(vha)
      setSummary(
        `${res.inserted} capítulo(s) ${res.created ? "e nova atleta criada" : "acrescentado(s) à atleta existente"}.`,
      )
      setPhase("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar o arquivo .vha.")
      setPhase("error")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="hub-theme max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--hub-text)]">{MODE_LABEL[mode]}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--hub-muted)] hover:bg-[var(--hub-bg-deep)] hover:text-[var(--hub-text)]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === "loading" && (
          <div className="flex items-center gap-2 py-8 text-[var(--hub-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lendo partidas e associando atletas…
          </div>
        )}

        {phase === "saving" && (
          <div className="flex items-center gap-2 py-8 text-[var(--hub-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando…
          </div>
        )}

        {phase === "pick-matches" && (
          <div>
            {matchItems.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-[var(--hub-muted)]" />
                <p className="font-medium text-[var(--hub-text)]">Nenhum jogo salvo encontrado</p>
                <p className="mt-1 text-sm text-[var(--hub-muted)]">
                  {mode === "video"
                    ? "Salve uma análise no Scout View IA para importá-la aqui."
                    : mode === "action"
                      ? "Finalize uma coleta no Scout Action para importá-la aqui."
                      : "Finalize e salve uma partida no Scout Volleyball para importá-la aqui."}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[var(--hub-muted)]">
                    Selecione os jogos que deseja importar.
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs font-medium text-[var(--hub-accent)] hover:underline"
                  >
                    {selectedIds.size === matchItems.length ? "Limpar seleção" : "Selecionar todos"}
                  </button>
                </div>
                <ul className="space-y-2">
                  {matchItems.map((m) => {
                    const checked = selectedIds.has(m.id)
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => toggle(m.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                            checked
                              ? "border-[var(--hub-accent)] bg-[var(--hub-accent)]/10"
                              : "border-[var(--hub-border)] bg-[var(--hub-bg-deep)]/40 hover:border-[var(--hub-muted)]"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-[var(--hub-accent)] bg-[var(--hub-accent)] text-black"
                                : "border-[var(--hub-border)]"
                            }`}
                          >
                            {checked && <CheckCircle2 className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-[var(--hub-text)]">
                              {m.title}
                            </span>
                            <span className="block text-xs text-[var(--hub-muted)]">{m.subtitle}</span>
                          </span>
                          {!m.hasRoster && (
                            <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                              sem nomes
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleContinueFromPick}
                    disabled={selectedIds.size === 0}
                    className="rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuar ({selectedIds.size})
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === "vha-pick" && (
          <div className="py-6">
            <p className="mb-4 text-sm text-[var(--hub-muted)]">
              Selecione um arquivo .vha. O Volley Tech localizará a atleta e acrescentará os capítulos —
              sem sobrescrever nada.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".vha,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleVHAFile(f)
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Escolher arquivo .vha
            </button>
          </div>
        )}

        {phase === "review" && (
          <div>
            <p className="mb-3 text-sm text-[var(--hub-muted)]">
              Confirme as associações. Correspondências exatas já estão marcadas; itens em dúvida
              precisam da sua confirmação.
            </p>
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg-deep)]/40 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--hub-text)]">{r.candidate.fullName}</p>
                      <p className="text-xs text-[var(--hub-muted)]">
                        {r.candidate.team} · {r.candidate.category} · {r.candidate.competition}
                      </p>
                    </div>
                    {r.status === "exact" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Vínculo automático
                      </span>
                    )}
                    {r.status === "new" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-xs text-sky-400">
                        <UserPlus className="h-3 w-3" /> Nova atleta
                      </span>
                    )}
                    {r.status === "ambiguous" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> Confirmar
                      </span>
                    )}
                  </div>

                  <select
                    value={decisions[i] ?? ""}
                    onChange={(e) => setDecisions((d) => ({ ...d, [i]: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
                  >
                    <option value="">Selecione…</option>
                    <option value="new">Criar nova atleta</option>
                    {r.suggestions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Vincular a: {s.full_name} ({[s.team, s.category].filter(Boolean).join(" · ") || "—"})
                      </option>
                    ))}
                    <option value="skip">Ignorar este registro</option>
                  </select>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLocal}
                disabled={pendingAmbiguous}
                className="rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar e importar
              </button>
            </div>
            {pendingAmbiguous && (
              <p className="mt-2 text-right text-xs text-amber-400">
                Resolva os itens marcados como &quot;Confirmar&quot; para continuar.
              </p>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <p className="font-medium text-[var(--hub-text)]">Importação concluída</p>
            <p className="mt-1 text-sm text-[var(--hub-muted)]">{summary}</p>
            <button
              onClick={onDone}
              className="mt-5 rounded-lg bg-[var(--hub-accent)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Concluir
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <p className="font-medium text-[var(--hub-text)]">Não foi possível importar</p>
            <p className="mt-1 text-sm text-[var(--hub-muted)]">{error}</p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg border border-[var(--hub-border)] px-4 py-2 text-sm text-[var(--hub-text)] hover:bg-[var(--hub-bg-deep)]"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
