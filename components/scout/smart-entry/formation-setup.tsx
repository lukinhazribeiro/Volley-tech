"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/scout/ui/button"
import { Card } from "@/components/scout/ui/card"
import type { Player } from "@/components/scout/team-roster-management"
import {
  type CourtPos,
  type Formation,
  type TeamSetup,
  type PlayerRole,
  ROLE_LABEL,
  DEFAULT_DEFENSIVE_BY_ROLE,
} from "@/lib/scout/smart-collector"

const POSITIONS: CourtPos[] = [1, 2, 3, 4, 5, 6]
const POSITION_HINT: Record<CourtPos, string> = {
  1: "Fundo direita (saque)",
  2: "Rede direita",
  3: "Rede meio",
  4: "Rede esquerda",
  5: "Fundo esquerda",
  6: "Fundo meio",
}

interface FormationSetupProps {
  teamAName: string
  teamBName: string
  teamAPlayers: Player[]
  teamBPlayers: Player[]
  onComplete: (setupA: TeamSetup, setupB: TeamSetup) => void
}

function buildSetup(players: Player[], formation: Partial<Formation>, libero: number | undefined): TeamSetup {
  const roles: Record<number, PlayerRole> = {}
  for (const p of players) {
    if (p.role) roles[p.number] = p.role
  }
  return {
    formation: formation as Formation,
    roles,
    liberoNumber: libero,
    defensiveByRole: { ...DEFAULT_DEFENSIVE_BY_ROLE },
  }
}

export default function FormationSetup({
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  onComplete,
}: FormationSetupProps) {
  const [formationA, setFormationA] = useState<Partial<Formation>>({})
  const [formationB, setFormationB] = useState<Partial<Formation>>({})
  const [liberoA, setLiberoA] = useState<number | undefined>(
    teamAPlayers.find((p) => p.role === "libero")?.number,
  )
  const [liberoB, setLiberoB] = useState<number | undefined>(
    teamBPlayers.find((p) => p.role === "libero")?.number,
  )
  const [error, setError] = useState<string | null>(null)

  // Líbero não entra na formação de saque (fica no banco até a rotação de fundo).
  const courtPlayersA = useMemo(() => teamAPlayers.filter((p) => p.role !== "libero"), [teamAPlayers])
  const courtPlayersB = useMemo(() => teamBPlayers.filter((p) => p.role !== "libero"), [teamBPlayers])

  const setPos = (team: "A" | "B", pos: CourtPos, value: number) => {
    if (team === "A") setFormationA((f) => ({ ...f, [pos]: value }))
    else setFormationB((f) => ({ ...f, [pos]: value }))
  }

  const isComplete = (f: Partial<Formation>) => POSITIONS.every((p) => f[p])

  const handleStart = () => {
    if (!isComplete(formationA) || !isComplete(formationB)) {
      setError("Preencha as 6 posições da formação inicial das duas equipes.")
      return
    }
    setError(null)
    onComplete(buildSetup(courtPlayersA, formationA, liberoA), buildSetup(courtPlayersB, formationB, liberoB))
  }

  const renderTeam = (
    team: "A" | "B",
    name: string,
    players: Player[],
    formation: Partial<Formation>,
    libero: number | undefined,
    setLibero: (n: number | undefined) => void,
  ) => {
    const accent = team === "A" ? "text-blue-600" : "text-orange-600"
    const usedNumbers = new Set(POSITIONS.map((p) => formation[p]).filter(Boolean) as number[])
    return (
      <div className="flex-1">
        <h3 className={`mb-3 text-xl font-bold ${accent}`}>{name}</h3>
        <div className="grid grid-cols-3 gap-2">
          {/* Ordem visual da quadra: fila da rede (4,3,2) em cima, fundo (5,6,1) embaixo */}
          {([4, 3, 2, 5, 6, 1] as CourtPos[]).map((pos) => (
            <div key={pos} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">P{pos}</span>
                <span className="text-[10px] text-slate-400">{POSITION_HINT[pos]}</span>
              </div>
              <select
                aria-label={`Atleta na posição ${pos}`}
                value={formation[pos] ?? ""}
                onChange={(e) => setPos(team, pos, Number(e.target.value))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="">Escolher</option>
                {players.map((p) => (
                  <option key={p.number} value={p.number} disabled={usedNumbers.has(p.number) && formation[pos] !== p.number}>
                    #{p.number} {p.name} {p.role ? `(${ROLE_LABEL[p.role]})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Líbero</label>
          <select
            value={libero ?? ""}
            onChange={(e) => setLibero(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
          >
            <option value="">Sem líbero</option>
            {teamPlayersWithLibero(team === "A" ? teamAPlayers : teamBPlayers).map((p) => (
              <option key={p.number} value={p.number}>
                #{p.number} {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            O líbero entra e sai automaticamente conforme o central passa pela linha de fundo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full w-full overflow-auto bg-gradient-to-br from-slate-50 to-white p-4">
      <Card className="mx-auto w-full max-w-5xl p-6 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Formação Inicial</h2>
          <p className="text-sm text-slate-600">
            Posicione os atletas em quadra. A partir daqui o rodízio, o líbero e o levantador são automáticos.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {renderTeam("A", teamAName, courtPlayersA, formationA, liberoA, setLiberoA)}
          {renderTeam("B", teamBName, courtPlayersB, formationB, liberoB, setLiberoB)}
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Button onClick={handleStart} className="bg-green-600 px-8 py-3 font-bold text-white hover:bg-green-700">
            Iniciar Partida
          </Button>
        </div>
      </Card>
    </div>
  )
}

function teamPlayersWithLibero(players: Player[]): Player[] {
  return players
}
