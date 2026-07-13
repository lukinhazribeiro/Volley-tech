"use client"

import { useEffect, useState } from "react"
import { BookmarkPlus, Download, FileBarChart, Plus, Shield, Trash2, X } from "lucide-react"
import {
  POSICAO_ORDER,
  ROLE_LABEL,
  type Player,
  type PlayerRole,
  type Posicao,
} from "@/lib/video-scout/types"
import { BACK_ROW, type TeamConfig } from "@/lib/video-scout/match"
import type { MatchHistoryEntry } from "@/lib/video-scout/history"
import {
  deletePreset,
  loadPresets,
  presetToTeam,
  savePreset,
  type TeamPreset,
} from "@/lib/video-scout/team-presets"

const ROLE_OPTIONS: { value: NonNullable<PlayerRole>; label: string }[] = [
  { value: "levantador", label: ROLE_LABEL.levantador },
  { value: "central", label: ROLE_LABEL.central },
  { value: "oposto", label: ROLE_LABEL.oposto },
  { value: "ponteiro", label: ROLE_LABEL.ponteiro },
  { value: "libero", label: ROLE_LABEL.libero },
]

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-orange-100 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ---------- Substituição ----------

interface SubstitutionDialogProps {
  team: TeamConfig
  posicao: Posicao
  onSubstitute: (newPlayerId: string) => void
  onClose: () => void
}

export function SubstitutionDialog({
  team,
  posicao,
  onSubstitute,
  onClose,
}: SubstitutionDialogProps) {
  const atual = team.formation[posicao]
  // Jogadores em quadra em outras posições (não disponíveis), exceto o atual.
  const emQuadra = new Set(
    POSICAO_ORDER.map((p) => team.formation[p]).filter((id): id is string => Boolean(id)),
  )
  const disponiveis = team.players.filter(
    (p) => p.id === atual || !emQuadra.has(p.id),
  )

  return (
    <Overlay onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          Substituir posição {posicao}
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        As ações já registradas continuam com o atleta anterior. O novo atleta assume a posição
        daqui pra frente.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {disponiveis.map((p) => {
          const isAtual = p.id === atual
          const isLibero = p.id === team.liberoId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSubstitute(p.id)
                onClose()
              }}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 transition-colors ${
                isAtual
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-orange-300"
              }`}
            >
              <span className="text-lg font-bold text-slate-800">#{p.number}</span>
              <span className="truncate text-[11px] text-slate-500">{p.name}</span>
              {isLibero && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                  <Shield className="h-2.5 w-2.5" /> Líbero
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Overlay>
  )
}

// ---------- Histórico de partidas ----------

interface HistoryDialogProps {
  entries: MatchHistoryEntry[]
  onOpen: (entry: MatchHistoryEntry) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function HistoryDialog({ entries, onOpen, onDelete, onClose }: HistoryDialogProps) {
  return (
    <Overlay onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Histórico de partidas</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Nenhuma partida salva ainda. Ao iniciar uma nova partida, a atual é guardada aqui
          automaticamente.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {e.teamAName} <span className="text-slate-400">vs</span> {e.teamBName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatDate(e.savedAt)} · {e.totalAcoes} ações
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                <span className="text-blue-600">{e.scoreA}</span>
                <span className="mx-1 text-slate-400">–</span>
                <span className="text-pink-600">{e.scoreB}</span>
              </span>
              <button
                type="button"
                onClick={() => onOpen(e)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileBarChart className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
                Relatório
              </button>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                className="shrink-0 text-slate-400 hover:text-red-500"
                aria-label="Excluir partida"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Overlay>
  )
}

// ---------- Configuração da equipe (líbero, levantador, elenco) ----------

interface TeamSetupDialogProps {
  team: TeamConfig
  onChange: (patch: Partial<TeamConfig>) => void
  onClose: () => void
}

export function TeamSetupDialog({ team, onChange, onClose }: TeamSetupDialogProps) {
  const [tab, setTab] = useState<"funcoes" | "libero" | "elenco" | "modelos">("funcoes")
  const [presets, setPresets] = useState<TeamPreset[]>([])
  const [presetName, setPresetName] = useState("")
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (tab === "modelos") setPresets(loadPresets())
  }, [tab])

  function handleSavePreset() {
    setPresets(savePreset(presetName, team))
    setPresetName("")
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  function handleLoadPreset(preset: TeamPreset) {
    // Aplica elenco, formação, líbero e levantador do modelo à equipe atual.
    const { side: _side, ...patch } = presetToTeam(preset, team.side)
    onChange(patch)
    onClose()
  }

  function handleDeletePreset(id: string) {
    setPresets(deletePreset(id))
  }

  const naoLiberos = team.players.filter((p) => p.id !== team.liberoId)

  function setLibero(id: string | null) {
    onChange({ liberoId: id, liberoReplaces: [] })
  }

  function toggleReplace(id: string) {
    const has = team.liberoReplaces.includes(id)
    onChange({
      liberoReplaces: has
        ? team.liberoReplaces.filter((x) => x !== id)
        : [...team.liberoReplaces, id],
    })
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    onChange({
      players: team.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }

  function addPlayer() {
    const usados = new Set(team.players.map((p) => p.number))
    let proximo = 1
    while (proximo <= 99 && usados.has(proximo)) proximo++
    if (proximo > 99) return
    const novo: Player = {
      id: `pl_${Date.now()}`,
      number: proximo,
      name: `Atleta ${proximo}`,
      team: team.side,
      posicao: null,
    }
    onChange({ players: [...team.players, novo] })
  }

  function removePlayer(id: string) {
    if (team.formation && Object.values(team.formation).includes(id)) return
    onChange({
      players: team.players.filter((p) => p.id !== id),
      liberoId: team.liberoId === id ? null : team.liberoId,
      liberoReplaces: team.liberoReplaces.filter((x) => x !== id),
    })
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold ${
      active ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`

  return (
    <Overlay onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Configuração da equipe</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nome da equipe (sempre visível) */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="team-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nome da equipe
        </label>
        <input
          id="team-name"
          type="text"
          value={team.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex.: Meu Time"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("funcoes")} className={tabClass(tab === "funcoes")}>
          Funções (5x1)
        </button>
        <button type="button" onClick={() => setTab("libero")} className={tabClass(tab === "libero")}>
          Líbero & Levantador
        </button>
        <button type="button" onClick={() => setTab("elenco")} className={tabClass(tab === "elenco")}>
          Elenco & Números
        </button>
        <button type="button" onClick={() => setTab("modelos")} className={tabClass(tab === "modelos")}>
          Modelos salvos
        </button>
      </div>

      {tab === "funcoes" && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Defina a função de cada atleta. No sistema 5x1, o líbero entra
            automaticamente pelo central que estiver no fundo, e o sistema
            identifica sozinho o central de rede e o de fundo a cada rotação.
          </p>
          {team.players.map((p) => {
            const pos = POSICAO_ORDER.find((q) => team.formation[q] === p.id)
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"
              >
                <span className="w-9 text-center text-sm font-bold text-slate-800">
                  #{p.number}
                </span>
                <span className="w-8 text-center text-[11px] text-slate-400">
                  {pos ?? "—"}
                </span>
                <select
                  value={p.role ?? ""}
                  onChange={(e) =>
                    updatePlayer(p.id, {
                      role: (e.target.value || null) as PlayerRole,
                    })
                  }
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                  aria-label={`Função do atleta ${p.number}`}
                >
                  <option value="">Sem função</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      {tab === "libero" && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Quem é o líbero?</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setLibero(null)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                  !team.liberoId
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                Nenhum
              </button>
              {naoLiberos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLibero(p.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                    team.liberoId === p.id
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  #{p.number}
                </button>
              ))}
            </div>
          </div>

          {team.liberoId && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-600">
                O líbero reveza com quais atletas? (fundo de quadra)
              </p>
              <p className="mb-2 text-[11px] text-slate-400">
                As ações de defesa/recepção desses atletas no fundo serão atribuídas ao líbero.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {naoLiberos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleReplace(p.id)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                      team.liberoReplaces.includes(p.id)
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    #{p.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Posição do levantador (auto-levantamento antes do ataque)
            </p>
            <div className="grid grid-cols-6 gap-2">
              {POSICAO_ORDER.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => onChange({ setterPosicao: pos })}
                  className={`rounded-lg border px-1 py-2 text-xs font-semibold ${
                    team.setterPosicao === pos
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Fundo de quadra: {BACK_ROW.join(", ")}
            </p>
          </div>
        </div>
      )}

      {tab === "elenco" && (
        <div className="space-y-2">
          {team.players.map((p) => {
            const emQuadra = Object.values(team.formation).includes(p.id)
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"
              >
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={p.number}
                  onChange={(e) => {
                    const n = Math.min(99, Math.max(1, Number(e.target.value) || 1))
                    updatePlayer(p.id, { number: n })
                  }}
                  className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-800"
                  aria-label="Número (1 a 99)"
                />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                  aria-label="Nome"
                />
                {p.id === team.liberoId && (
                  <Shield className="h-4 w-4 shrink-0 text-amber-500" aria-label="Líbero" />
                )}
                <button
                  type="button"
                  onClick={() => removePlayer(p.id)}
                  disabled={emQuadra}
                  className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-30"
                  title={emQuadra ? "Em quadra — substitua antes de remover" : "Remover"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={addPlayer}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Adicionar atleta
          </button>
        </div>
      )}

      {tab === "modelos" && (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400">
            Salve esta equipe (elenco, números, funções, líbero e levantador) para reaproveitar em
            partidas futuras sem reconfigurar tudo de novo.
          </p>

          {/* Salvar equipe atual como modelo */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={`Nome do modelo (ex.: ${team.name})`}
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none"
              aria-label="Nome do modelo"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
            >
              <BookmarkPlus className="h-4 w-4" /> Salvar
            </button>
          </div>
          {savedFlash && <p className="text-[11px] font-medium text-emerald-600">Modelo salvo!</p>}

          {/* Lista de modelos salvos */}
          {presets.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
              Nenhum modelo salvo ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{preset.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {preset.team.players.length} atletas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
                    Usar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="shrink-0 text-slate-400 hover:text-red-500"
                    aria-label={`Excluir modelo ${preset.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Overlay>
  )
}
