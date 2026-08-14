"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Save, Library, Trash2, Pencil, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { applyTeamPatch, type TeamConfig } from "@/lib/video-scout/match"
import {
  loadPresets,
  savePreset,
  presetToTeam,
  subscribeToPresets,
  migrateLocalPresets,
  deletePreset,
  type TeamPreset,
} from "@/lib/video-scout/team-presets"
import type { ActionSide } from "@/lib/scout-action/types"
import { SIDE_MAP } from "@/lib/scout-action/config"
import { TeamEditor } from "./team-editor"

interface ActionMatchMenuProps {
  competition: string
  category: string
  firstServer: ActionSide
  teamA: TeamConfig
  teamB: TeamConfig
  /** Trava a escolha do primeiro saque (após o jogo começar). */
  lockServer?: boolean
  onChangeMeta: (patch: { competition?: string; category?: string; firstServer?: ActionSide }) => void
  onChangeTeam: (side: ActionSide, team: TeamConfig) => void
  onClose: () => void
}

export function ActionMatchMenu({
  competition,
  category,
  firstServer,
  teamA,
  teamB,
  lockServer,
  onChangeMeta,
  onChangeTeam,
  onClose,
}: ActionMatchMenuProps) {
  const [presets, setPresets] = useState<TeamPreset[]>([])
  const [editing, setEditing] = useState<ActionSide | null>(null)
  const [saving, setSaving] = useState<ActionSide | null>(null)
  const [saveName, setSaveName] = useState("")
  const [loadFor, setLoadFor] = useState<ActionSide | null>(null)

  // Biblioteca de equipes compartilhada (mesma tabela dos outros módulos).
  useEffect(() => {
    let active = true
    async function init() {
      await migrateLocalPresets()
      const pres = await loadPresets()
      if (active) setPresets(pres)
    }
    init()
    const unsub = subscribeToPresets(() => {
      loadPresets().then((p) => active && setPresets(p))
    })
    return () => {
      active = false
      unsub()
    }
  }, [])

  const teamFor = (side: ActionSide) => (side === "A" ? teamA : teamB)

  function patchTeam(side: ActionSide, patch: Partial<TeamConfig>) {
    onChangeTeam(side, applyTeamPatch(teamFor(side), patch))
  }

  function loadPreset(preset: TeamPreset, side: ActionSide) {
    onChangeTeam(side, presetToTeam(preset, SIDE_MAP[side]))
    setLoadFor(null)
  }

  async function handleSavePreset() {
    if (!saving) return
    const team = teamFor(saving)
    setPresets(await savePreset(saveName.trim() || team.name, team))
    setSaving(null)
    setSaveName("")
  }

  async function handleDeletePreset(id: string) {
    if (!confirm("Excluir esta equipe salva da biblioteca?")) return
    setPresets(await deletePreset(id))
  }

  // Edição da quadra de uma equipe (tela cheia).
  if (editing) {
    const side = editing
    return (
      <TeamEditor
        team={teamFor(side)}
        accent={side === "A" ? "sky" : "orange"}
        title={`Editar ${side === "A" ? "Equipe A" : "Equipe B"}`}
        onChange={(patch) => patchTeam(side, patch)}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="size-4" />
          Voltar ao painel
        </button>

        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Equipes & Partida</h1>
        <p className="mb-6 text-sm text-slate-400">
          Edite as equipes, atletas, posições e dados do jogo a qualquer momento. As equipes salvas são
          compartilhadas com o Scout Volleyball, Scout View e Summary Game.
        </p>

        {/* Dados da partida */}
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Competição</span>
            <input
              value={competition}
              onChange={(e) => onChangeMeta({ competition: e.target.value })}
              placeholder="Ex.: Estadual Sub-17"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Categoria</span>
            <input
              value={category}
              onChange={(e) => onChangeMeta({ category: e.target.value })}
              placeholder="Ex.: Sub-17 Feminino"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            />
          </label>
        </div>

        {/* Equipes */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["A", "B"] as ActionSide[]).map((side) => {
            const team = teamFor(side)
            const accent = side === "A" ? "text-sky-400" : "text-orange-400"
            const inCourt = team.players.filter((p) => p.posicao).length
            return (
              <div key={side} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className={`size-4 ${accent}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Equipe {side}
                  </span>
                </div>
                <input
                  value={team.name}
                  onChange={(e) => onChangeTeam(side, { ...team, name: e.target.value })}
                  placeholder={`Equipe ${side}`}
                  className="mb-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100"
                />
                <p className="mb-3 text-xs text-slate-500">
                  {team.players.length} atletas · {inCourt} em quadra
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                    onClick={() => setEditing(side)}
                  >
                    <Pencil className="size-3.5" />
                    Editar quadra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                    onClick={() => setLoadFor(side)}
                  >
                    <Library className="size-3.5" />
                    Carregar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                    onClick={() => {
                      setSaving(side)
                      setSaveName(team.name)
                    }}
                  >
                    <Save className="size-3.5" />
                    Salvar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Primeiro saque */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="mb-2 block text-xs font-medium text-slate-400">
            Primeiro saque {lockServer && <span className="text-slate-600">(partida já iniciada)</span>}
          </span>
          <div className="flex gap-2">
            {(["A", "B"] as ActionSide[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={lockServer}
                onClick={() => onChangeMeta({ firstServer: s })}
                className={`flex-1 rounded-lg border py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                  firstServer === s
                    ? "border-orange-400 bg-orange-500/10 text-orange-300"
                    : "border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                {s === "A" ? teamA.name || "Equipe A" : teamB.name || "Equipe B"}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={onClose} className="w-full gap-2 bg-orange-600 py-6 text-base font-bold text-white hover:bg-orange-500">
          Voltar ao painel
        </Button>
      </div>

      {/* Modal: salvar equipe */}
      {saving && (
        <Modal onClose={() => setSaving(null)} title={`Salvar Equipe ${saving} na biblioteca`}>
          <p className="mb-3 text-sm text-slate-400">
            A equipe fica salva na nuvem e disponível em todos os módulos (Scout Volleyball, View, Action e
            Summary Game).
          </p>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Nome da equipe"
            className="mb-4 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
              onClick={() => setSaving(null)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePreset} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-500">
              <Save className="size-4" />
              Salvar
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal: carregar equipe */}
      {loadFor && (
        <Modal onClose={() => setLoadFor(null)} title={`Carregar equipe salva → Equipe ${loadFor}`}>
          {presets.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma equipe salva ainda. Salve uma equipe para reaproveitá-la aqui e nos outros módulos.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{preset.name}</p>
                    <p className="text-xs text-slate-500">{preset.team.players.length} atletas</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      className="bg-orange-600 text-white hover:bg-orange-500"
                      onClick={() => loadPreset(preset, loadFor)}
                    >
                      Usar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400"
                      onClick={() => handleDeletePreset(preset.id)}
                      aria-label="Excluir equipe salva"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
        {children}
      </div>
    </div>
  )
}
