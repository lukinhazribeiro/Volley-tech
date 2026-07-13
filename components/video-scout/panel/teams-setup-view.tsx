"use client"

import { Plus, Settings2, Trash2, Play } from "lucide-react"
import type { Player, TeamSide } from "@/lib/video-scout/types"
import type { TeamConfig } from "@/lib/video-scout/match"

interface TeamsSetupViewProps {
  teamA: TeamConfig
  teamB: TeamConfig
  onChangeTeam: (side: TeamSide, patch: Partial<TeamConfig>) => void
  onOpenAdvanced: (side: TeamSide) => void
  onStart: () => void
}

export function TeamsSetupView({
  teamA,
  teamB,
  onChangeTeam,
  onOpenAdvanced,
  onStart,
}: TeamsSetupViewProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Equipes</h2>
        <p className="mt-1 text-sm text-slate-500 text-pretty">
          Monte suas equipes: dê um nome, edite os números e adicione os atletas. Depois é só
          iniciar a partida.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TeamCard
          team={teamA}
          accent="blue"
          onChange={(patch) => onChangeTeam("casa", patch)}
          onOpenAdvanced={() => onOpenAdvanced("casa")}
        />
        <TeamCard
          team={teamB}
          accent="pink"
          onChange={(patch) => onChangeTeam("adversario", patch)}
          onOpenAdvanced={() => onOpenAdvanced("adversario")}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Iniciar partida
        </button>
      </div>
    </div>
  )
}

function TeamCard({
  team,
  accent,
  onChange,
  onOpenAdvanced,
}: {
  team: TeamConfig
  accent: "blue" | "pink"
  onChange: (patch: Partial<TeamConfig>) => void
  onOpenAdvanced: () => void
}) {
  const accentBar = accent === "blue" ? "bg-blue-500" : "bg-pink-500"
  const accentText = accent === "blue" ? "text-blue-600" : "text-pink-600"

  // Atletas ordenados por número para leitura fácil.
  const players = [...team.players].sort((a, b) => a.number - b.number)

  function updatePlayer(id: string, patch: Partial<Player>) {
    onChange({ players: team.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
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
    // Não remove quem está escalado em quadra (na formação).
    if (team.formation && Object.values(team.formation).includes(id)) return
    onChange({
      players: team.players.filter((p) => p.id !== id),
      liberoId: team.liberoId === id ? null : team.liberoId,
      liberoReplaces: team.liberoReplaces.filter((x) => x !== id),
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Cabeçalho com nome editável */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-6 w-1.5 shrink-0 rounded-full ${accentBar}`} />
        <input
          type="text"
          value={team.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome da equipe"
          className={`min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 py-1 text-lg font-bold outline-none focus:border-slate-300 ${accentText}`}
          aria-label="Nome da equipe"
        />
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {team.players.length} atletas
        </span>
      </div>

      {/* Lista de atletas */}
      <div className="space-y-1.5">
        {players.map((p) => {
          const emQuadra = team.formation && Object.values(team.formation).includes(p.id)
          const isLibero = team.liberoId === p.id
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <input
                type="number"
                min={1}
                max={99}
                value={p.number}
                onChange={(e) => updatePlayer(p.id, { number: Number(e.target.value) || 0 })}
                className="w-12 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-center text-sm font-bold text-slate-700 focus:border-orange-400 focus:outline-none"
                aria-label={`Número de ${p.name}`}
              />
              <input
                type="text"
                value={p.name}
                onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 focus:border-slate-200 focus:bg-white focus:outline-none"
                aria-label={`Nome do atleta ${p.number}`}
              />
              {isLibero && (
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                  Líbero
                </span>
              )}
              {emQuadra && !isLibero && (
                <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                  Em quadra
                </span>
              )}
              <button
                type="button"
                onClick={() => removePlayer(p.id)}
                disabled={!!emQuadra}
                className="shrink-0 text-slate-300 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Remover ${p.name}`}
                title={emQuadra ? "Atleta em quadra não pode ser removido" : "Remover atleta"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Ações */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={addPlayer}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar atleta
        </button>
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Settings2 className="h-4 w-4 text-orange-600" aria-hidden="true" /> Funções, líbero e
          modelos
        </button>
      </div>
    </section>
  )
}
