"use client"

import { useState } from "react"
import { Button } from "@/components/scout/ui/button"
import { Input } from "@/components/scout/ui/input"
import { Card } from "@/components/scout/ui/card"
import { X, Plus } from 'lucide-react'
import { ROLE_OPTIONS, type PlayerRole } from "@/lib/scout/smart-collector"

export interface Player {
  number: number
  name: string
  /** Função do atleta — usada pela inteligência do coletor durante a partida. */
  role?: PlayerRole
}

interface TeamRosterManagementProps {
  teamAName: string
  teamBName: string
  onRosterComplete: (teamAPlayers: Player[], teamBPlayers: Player[]) => void
}

export default function TeamRosterManagement({
  teamAName,
  teamBName,
  onRosterComplete,
}: TeamRosterManagementProps) {
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>(
    Array.from({ length: 14 }, (_, i) => ({ number: i + 1, name: "" }))
  )
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>(
    Array.from({ length: 14 }, (_, i) => ({ number: i + 1, name: "" }))
  )

  const handlePlayerChange = (
    team: "A" | "B",
    index: number,
    field: "number" | "name" | "role",
    value: string | number,
  ) => {
    const players = team === "A" ? [...teamAPlayers] : [...teamBPlayers]
    if (field === "number") {
      players[index] = { ...players[index], number: Number(value) }
    } else if (field === "role") {
      players[index] = { ...players[index], role: value as PlayerRole }
    } else {
      players[index] = { ...players[index], name: value as string }
    }

    if (team === "A") {
      setTeamAPlayers(players)
    } else {
      setTeamBPlayers(players)
    }
  }

  const handleAddPlayer = (team: "A" | "B") => {
    const players = team === "A" ? [...teamAPlayers] : [...teamBPlayers]
    const maxNumber = Math.max(...players.map((p) => p.number), 0)
    players.push({ number: maxNumber + 1, name: "" })

    if (team === "A") {
      setTeamAPlayers(players)
    } else {
      setTeamBPlayers(players)
    }
  }

  const handleRemovePlayer = (team: "A" | "B", index: number) => {
    const players = team === "A" ? [...teamAPlayers] : [...teamBPlayers]
    if (players.length > 1) {
      players.splice(index, 1)
      if (team === "A") {
        setTeamAPlayers(players)
      } else {
        setTeamBPlayers(players)
      }
    }
  }

  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    // Cadastro NÃO é obrigatório aqui: os atletas, funções e a formação também
    // podem ser definidos direto na quadra do coletor. Passamos adiante o que
    // estiver preenchido (com nome), sem travar o início da coleta.
    const activeA = teamAPlayers.filter((p) => p.name.trim())
    const activeB = teamBPlayers.filter((p) => p.name.trim())
    setError(null)
    onRosterComplete(activeA, activeB)
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4 overflow-auto">
      <Card className="w-full max-w-6xl mx-auto p-8 bg-white shadow-2xl border border-orange-100">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cadastro de Jogadores</h1>
          <p className="text-slate-600">Configure os jogadores de cada equipe</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team A Roster */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-red-600">{teamAName}</h2>
              <Button onClick={() => handleAddPlayer("A")} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {teamAPlayers.map((player, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-20">
                    <Input
                      type="number"
                      value={player.number}
                      onChange={(e) => handlePlayerChange("A", index, "number", e.target.value)}
                      className="text-center font-bold"
                      min={1}
                      max={99}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange("A", index, "name", e.target.value)}
                      placeholder="Nome do jogador"
                    />
                  </div>
                  <select
                    aria-label="Função do atleta"
                    value={player.role ?? ""}
                    onChange={(e) => handlePlayerChange("A", index, "role", e.target.value)}
                    className={`h-9 w-28 rounded-md border bg-white px-2 text-sm ${
                      player.name.trim() && !player.role ? "border-red-400" : "border-red-200"
                    }`}
                  >
                    <option value="">Função</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => handleRemovePlayer("A", index)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Team B Roster */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-600">{teamBName}</h2>
              <Button onClick={() => handleAddPlayer("B")} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {teamBPlayers.map((player, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-20">
                    <Input
                      type="number"
                      value={player.number}
                      onChange={(e) => handlePlayerChange("B", index, "number", e.target.value)}
                      className="text-center font-bold"
                      min={1}
                      max={99}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange("B", index, "name", e.target.value)}
                      placeholder="Nome do jogador"
                    />
                  </div>
                  <select
                    aria-label="Função do atleta"
                    value={player.role ?? ""}
                    onChange={(e) => handlePlayerChange("B", index, "role", e.target.value)}
                    className={`h-9 w-28 rounded-md border bg-white px-2 text-sm ${
                      player.name.trim() && !player.role ? "border-red-400" : "border-blue-200"
                    }`}
                  >
                    <option value="">Função</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => handleRemovePlayer("B", index)}
                    size="sm"
                    variant="ghost"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3">
            Confirmar e Iniciar Coleta
          </Button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-slate-700">
            <strong>Importante:</strong> Configure os números e nomes dos jogadores. Os números serão usados na seleção
            durante a coleta de dados.
          </p>
        </div>
      </Card>
    </div>
  )
}
