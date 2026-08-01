"use client"

import { useEffect, useRef, useState } from "react"
import { X, CheckCircle2, AlertTriangle, Loader2, UserPlus } from "lucide-react"
import {
  buildCandidatesFromLocalMatches,
  loadVideoScoutCandidates,
  matchCandidates,
  createAthlete,
  saveAlias,
  insertHistoryEntries,
  logImport,
} from "@/lib/hub/data"
import { parseVHA, importVHA } from "@/lib/hub/vha"
import type { ImportCandidate, MatchResult } from "@/lib/hub/types"

type Mode = "local" | "video" | "vha"
type Phase = "loading" | "review" | "vha-pick" | "saving" | "done" | "error"

const MODE_LABEL: Record<Mode, string> = {
  local: "Importar do Scout Volleyball",
  video: "Importar do Scout View IA",
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
  const [results, setResults] = useState<MatchResult[]>([])
  // Decisão do usuário por índice: athleteId escolhido, "new" ou "skip".
  const [decisions, setDecisions] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [summary, setSummary] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Import de módulo (Scout Volleyball ou Scout View IA): gera candidatos e roda
  // a associação inteligente de atletas.
  useEffect(() => {
    if (mode === "vha") return
    ;(async () => {
      try {
        const candidates: ImportCandidate[] =
          mode === "video" ? await loadVideoScoutCandidates() : buildCandidatesFromLocalMatches()
        if (candidates.length === 0) {
          setError(
            mode === "video"
              ? "Nenhuma atleta com nome foi encontrada no histórico do Scout View IA. Preencha os nomes do elenco no painel de análise antes de importar."
              : "Nenhuma atleta com nome foi encontrada nas partidas salvas. Cadastre os nomes no elenco ao configurar a partida no Scout Volleyball.",
          )
          setPhase("error")
          return
        }
        const matched = await matchCandidates(candidates)
        setResults(matched)
        // Pré-preenche decisões: exact/new já resolvidos; ambíguos aguardam.
        const initial: Record<number, string> = {}
        matched.forEach((r, i) => {
          if (r.status === "exact") initial[i] = r.athleteId!
          else if (r.status === "new") initial[i] = "new"
          else initial[i] = "" // ambíguo: pendente
        })
        setDecisions(initial)
        setPhase("review")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao ler o histórico local.")
        setPhase("error")
      }
    })()
  }, [mode])

  const pendingAmbiguous = results.some((r, i) => r.status === "ambiguous" && !decisions[i])

  async function handleConfirmLocal() {
    setPhase("saving")
    try {
      const toInsert: Array<{ athleteId: string; candidate: MatchResult["candidate"] }> = []

      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        const decision = decisions[i]
        if (decision === "skip" || !decision) continue

        let athleteId: string
        if (decision === "new") {
          athleteId = await createAthlete({
            fullName: r.candidate.fullName,
            team: r.candidate.team,
            category: r.candidate.category,
            position: r.candidate.position,
          })
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

        toInsert.push({ athleteId, candidate: r.candidate })
      }

      const source = mode === "video" ? "scout_video" : "scout_local"
      let inserted = 0
      // Insere agrupando por atleta para respeitar a checagem de duplicidade.
      for (const item of toInsert) {
        inserted += await insertHistoryEntries([
          { athleteId: item.athleteId, candidate: item.candidate, source },
        ])
      }

      const originLabel = mode === "video" ? "Scout View IA" : "Scout Volleyball"
      await logImport(mode, `${originLabel} (${toInsert.length} atleta(s))`, inserted)
      setSummary(`${inserted} capítulo(s) adicionado(s) para ${toInsert.length} atleta(s).`)
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

        {phase === "vha-pick" && (
          <div className="py-6">
            <p className="mb-4 text-sm text-[var(--hub-muted)]">
              Selecione um arquivo .vha. O Volley Hub localizará a atleta e acrescentará os capítulos —
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
