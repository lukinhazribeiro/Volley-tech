"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Play, Users, Save, Library, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createTeam, applyTeamPatch, type TeamConfig } from "@/lib/video-scout/match"
import type { Player, TeamSide } from "@/lib/video-scout/types"
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
import { TeamEditor } from "./team-editor"

export interface ActionMatchConfig {
  category: string
  competition: string
  teamA: TeamConfig
  teamB: TeamConfig
  firstServer: ActionSide
}

/** A = casa, B = adversario no modelo do motor. */
const SIDE_MAP: Record<ActionSide, TeamSide> = { A: "casa", B: "adversario" }

interface ActionSetupProps {
  onStart: (config: ActionMatchConfig) => void
  onBack: () => void
}

export function ActionSetup({ onStart, onBack }: ActionSetupProps) {
  const [category, setCategory] = useState("")
  const [competition, setCompetition] = useState("")
  const [firstServer, setFirstServer] = useState<ActionSide>("A")
  const [teamA, setTeamA] = useState<TeamConfig>(() => createTeam("casa", "Equipe A"))
  const [teamB, setTeamB] = useState<TeamConfig>(() => createTeam("adversario", "Equipe B"))

  const [presets, setPresets] = useState<TeamPreset[]>([])
  const [editing, setEditing] = useState<ActionSide | null>(null)
  const [saving, setSaving] = useState<ActionSide | null>(null)
  const [saveName, setSaveName] = useState("")
  const [loadFor, setLoadFor] = useState<ActionSide | null>(null)

  // Biblioteca de equipes na nuvem (mesma tabela do Scout View / 3 módulos).
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
  const setTeamFor = (side: ActionSide, team: TeamConfig) =>
    side === "A" ? setTeamA(team) : setTeamB(team)

  const patchTeam = useCallback((side: ActionSide, patch: Partial<TeamConfig>) => {
    const apply = side === "A" ? setTeamA : setTeamB
    apply((prev) => applyTeamPatch(prev, patch))
  }, [])

  function loadPreset(preset: TeamPreset, side: ActionSide) {
    const team = presetToTeam(preset, SIDE_MAP[side])
    setTeamFor(side, team)
    setLoadFor(null)
  }

  async function handleSavePreset() {
    if (!saving) return
    const team = teamFor(saving)
    const next = await savePreset(saveName.trim() || team.name, team)
    setPresets(next)
    setSaving(null)
    setSaveName("")
  }

  async function handleDeletePreset(id: string) {
    if (!confirm("Excluir esta equipe salva da biblioteca?")) return
    setPresets(await deletePreset(id))
  }

  function handleStart() {
    onStart({
      category: category.trim(),
      competition: competition.trim(),
      teamA,
      teamB,
      firstServer,
    })
  }

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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </button>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">Nova coleta</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Monte as duas equipes (A e B). Ambas são coletadas em detalhe, geram índice e vão para a Hub.
      </p>

      {/* Dados da partida */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Competição</span>
          <input
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            placeholder="Ex.: Estadual Sub-17"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Sub-17 Feminino"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
      </div>

      {/* Equipes */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["A", "B"] as ActionSide[]).map((side) => {
          const team = teamFor(side)
          const accent = side === "A" ? "text-sky-600" : "text-orange-600"
          const inCourt = team.players.filter((p) => p.posicao).length
          return (
            <div key={side} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className={`size-4 ${accent}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Equipe {side}
                </span>
              </div>
              <input
                value={team.name}
                onChange={(e) => setTeamFor(side, { ...team, name: e.target.value })}
                placeholder={`Equipe ${side}`}
                className="mb-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground"
              />
              <p className="mb-3 text-xs text-muted-foreground">
                {team.players.length} atletas · {inCourt} em quadra
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={() => setEditing(side)}>
                  <Pencil className="size-3.5" />
                  Editar quadra
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={() => setLoadFor(side)}>
                  <Library className="size-3.5" />
                  Carregar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-transparent"
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
      <div className="mb-5 rounded-xl border border-border bg-card p-4">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Primeiro saque</span>
        <div className="flex gap-2">
          {(["A", "B"] as ActionSide[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFirstServer(s)}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
                firstServer === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground"
              }`}
            >
              {s === "A" ? teamA.name || "Equipe A" : teamB.name || "Equipe B"}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleStart} className="w-full gap-2 py-6 text-base font-bold">
        <Play className="size-5" />
        Iniciar coleta
      </Button>

      {/* Modal: salvar equipe */}
      {saving && (
        <Modal onClose={() => setSaving(null)} title={`Salvar Equipe ${saving} na biblioteca`}>
          <p className="mb-3 text-sm text-muted-foreground">
            A equipe fica salva na nuvem e disponível nos três módulos (Scout View, Volleyball e Action).
          </p>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Nome da equipe"
            className="mb-4 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSaving(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePreset} className="gap-1.5">
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
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma equipe salva ainda. Salve uma equipe para reaproveitá-la aqui e nos outros módulos.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {preset.team.players.length} atletas
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" onClick={() => loadPreset(preset, loadFor)}>
                      Usar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// Reexporta o tipo Player para o editor (mantém o import coeso).
export type { Player }
