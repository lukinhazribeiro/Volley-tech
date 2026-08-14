"use client"

import { Plus, Trash2, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TeamConfig } from "@/lib/video-scout/match"
import { POSICAO_ORDER, ROLE_LABEL, type Player, type PlayerRole, type Posicao } from "@/lib/video-scout/types"

const ROLES: NonNullable<PlayerRole>[] = ["levantador", "central", "oposto", "ponteiro", "libero"]

interface TeamEditorProps {
  team: TeamConfig
  title: string
  accent: "sky" | "orange"
  onChange: (patch: Partial<TeamConfig>) => void
  onClose: () => void
}

/**
 * Editor de UMA equipe (TeamConfig): número, nome e função de cada atleta,
 * posição em quadra (P1–P6), líbero e posição do levantador. É o que garante
 * que a quadra do painel apareça correta e que o rodízio/auto-levantamento
 * funcionem.
 */
export function TeamEditor({ team, title, accent, onChange, onClose }: TeamEditorProps) {
  const accentText = accent === "sky" ? "text-sky-600" : "text-orange-600"

  function updatePlayer(id: string, patch: Partial<Player>) {
    onChange({ players: team.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }

  function addPlayer() {
    const nextNum = Math.max(0, ...team.players.map((p) => p.number)) + 1
    const player: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      number: nextNum,
      name: "",
      team: team.side,
      posicao: null,
      role: null,
    }
    onChange({ players: [...team.players, player] })
  }

  function removePlayer(id: string) {
    // Limpa referências em formação/líbero.
    const formation = { ...team.formation }
    for (const pos of POSICAO_ORDER) if (formation[pos] === id) formation[pos] = null
    onChange({
      players: team.players.filter((p) => p.id !== id),
      formation,
      liberoId: team.liberoId === id ? null : team.liberoId,
      liberoReplaces: team.liberoReplaces.filter((r) => r !== id),
    })
  }

  /** Define (ou limpa) a posição de quadra de um atleta na formação. */
  function setPosition(id: string, pos: Posicao | "") {
    const formation = { ...team.formation }
    // Remove o atleta de qualquer posição anterior.
    for (const p of POSICAO_ORDER) if (formation[p] === id) formation[p] = null
    if (pos) formation[pos] = id
    onChange({ formation })
  }

  function positionOf(id: string): Posicao | "" {
    return (POSICAO_ORDER.find((p) => team.formation[p] === id) as Posicao) || ""
  }

  const sorted = [...team.players].sort((a, b) => a.number - b.number)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Users className={`size-5 ${accentText}`} />
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome da equipe</span>
            <input
              value={team.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Elenco · {team.players.length}
              </span>
              <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={addPlayer}>
                <Plus className="size-3.5" />
                Adicionar
              </Button>
            </div>

            <ul className="space-y-2">
              {sorted.map((p) => {
                const isLibero = team.liberoId === p.id
                return (
                  <li key={p.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-2">
                    <div className="flex flex-col">
                      <span className="px-1 text-[10px] uppercase text-muted-foreground">Nº</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={p.number}
                        onChange={(e) => updatePlayer(p.id, { number: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                        className="w-14 rounded-md border border-input bg-card px-2 py-1.5 text-center text-sm font-bold tabular-nums text-foreground"
                      />
                    </div>
                    <div className="flex min-w-[120px] flex-1 flex-col">
                      <span className="px-1 text-[10px] uppercase text-muted-foreground">Nome</span>
                      <input
                        value={p.name}
                        onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                        className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="px-1 text-[10px] uppercase text-muted-foreground">Função</span>
                      <select
                        value={p.role ?? ""}
                        onChange={(e) => updatePlayer(p.id, { role: (e.target.value || null) as PlayerRole })}
                        className="rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="">—</option>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="px-1 text-[10px] uppercase text-muted-foreground">Quadra</span>
                      <select
                        value={positionOf(p.id)}
                        onChange={(e) => setPosition(p.id, e.target.value as Posicao | "")}
                        className="rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="">Reserva</option>
                        {POSICAO_ORDER.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange({ liberoId: isLibero ? null : p.id })}
                      className={`mb-0.5 rounded-md px-2 py-1.5 text-xs font-semibold ${
                        isLibero ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"
                      }`}
                      title="Marcar como líbero"
                    >
                      Líbero
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="mb-0.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remover atleta ${p.number}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <Button onClick={onClose} className="w-full">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  )
}
