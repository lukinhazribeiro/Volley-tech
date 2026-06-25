"use client"

import { useState } from "react"
import { Card } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"
import type { CourtRotation, PlayerPosition } from "@/lib/scout/rotation-manager"
import { rotatePositions, updatePlayerAtPosition } from "@/lib/scout/rotation-manager"

interface CourtRotationDisplayProps {
  teamARotation: CourtRotation
  teamBRotation: CourtRotation
  onRotationChange?: (teamId: "A" | "B", rotation: PlayerPosition[]) => void
}

export default function CourtRotationDisplay({
  teamARotation,
  teamBRotation,
  onRotationChange,
}: CourtRotationDisplayProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B">("A")
  const [availablePlayers] = useState<number[]>(Array.from({ length: 14 }, (_, i) => i + 1))
  const [undoHistory, setUndoHistory] = useState<{ teamId: "A" | "B"; rotation: PlayerPosition[] }[]>([])

  const handlePlayerSelect = (playerNumber: number) => {
    setSelectedPlayer(selectedPlayer === playerNumber ? null : playerNumber)
  }

  const handlePositionClick = (teamId: "A" | "B", position: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!selectedPlayer) return

    const rotation = teamId === "A" ? teamARotation : teamBRotation

    setUndoHistory([...undoHistory, { teamId, rotation: rotation.currentRotation }])

    const newRotation = updatePlayerAtPosition(rotation.currentRotation, position, selectedPlayer)
    onRotationChange?.(teamId, newRotation)
    setSelectedPlayer(null)
  }

  const handleRotate = (teamId: "A" | "B") => {
    const rotation = teamId === "A" ? teamARotation : teamBRotation

    setUndoHistory([...undoHistory, { teamId, rotation: rotation.currentRotation }])

    const newRotation = rotatePositions(rotation.currentRotation)
    onRotationChange?.(teamId, newRotation)
  }

  const handleUndo = () => {
    if (undoHistory.length === 0) return

    const lastChange = undoHistory[undoHistory.length - 1]
    onRotationChange?.(lastChange.teamId, lastChange.rotation)
    setUndoHistory(undoHistory.slice(0, -1))
  }

  const renderCourt = (teamId: "A" | "B", rotation: CourtRotation, teamName: string, teamColor: string) => {
    const getPlayerAtPosition = (pos: 1 | 2 | 3 | 4 | 5 | 6) =>
      rotation.currentRotation.find((p) => p.position === pos)?.playerNumber

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold text-white px-4 py-2 rounded-lg ${teamColor}`}>{teamName}</h3>
          <Button
            onClick={() => handleRotate(teamId)}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            🔄 Rodar Posições
          </Button>
        </div>

        <div className="relative w-full max-w-sm mx-auto bg-gradient-to-b from-amber-100 to-amber-50 p-4 rounded-lg border-4 border-white shadow-lg">
          <svg viewBox="0 0 320 360" className="w-full">
            {/* Court outline */}
            <rect x="20" y="20" width="280" height="320" fill="#c4614e" stroke="#fff" strokeWidth="3" />
            {/* Net */}
            <rect
              x="20"
              y="165"
              width="280"
              height="30"
              fill="none"
              stroke="#000"
              strokeWidth="2"
              strokeDasharray="10,5"
            />
            <line x1="20" y1="20" x2="300" y2="20" stroke="#fff" strokeWidth="3" />
            <line x1="20" y1="340" x2="300" y2="340" stroke="#fff" strokeWidth="3" />
            <line x1="20" y1="20" x2="20" y2="340" stroke="#fff" strokeWidth="3" />
            <line x1="300" y1="20" x2="300" y2="340" stroke="#fff" strokeWidth="3" />
            <line x1="20" y1="180" x2="300" y2="180" stroke="#fff" strokeWidth="2" />

            {/* Front row (Frente) - positions 4, 3, 2 */}
            <g>
              {/* Position 4 - Central */}
              <circle
                cx="80"
                cy="80"
                r="28"
                fill={getPlayerAtPosition(4) ? "#3b82f6" : "#dbeafe"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#1e40af"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 4)}
              />
              <text x="80" y="95" textAnchor="middle" className="text-2xl font-bold fill-slate-900 pointer-events-none">
                {getPlayerAtPosition(4) || "IV"}
              </text>
              <text
                x="80"
                y="115"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Central
              </text>

              {/* Position 3 - Ponta E */}
              <circle
                cx="160"
                cy="80"
                r="28"
                fill={getPlayerAtPosition(3) ? "#3b82f6" : "#dbeafe"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#1e40af"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 3)}
              />
              <text
                x="160"
                y="95"
                textAnchor="middle"
                className="text-2xl font-bold fill-slate-900 pointer-events-none"
              >
                {getPlayerAtPosition(3) || "III"}
              </text>
              <text
                x="160"
                y="115"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Ponta E
              </text>

              {/* Position 2 - Ponta D */}
              <circle
                cx="240"
                cy="80"
                r="28"
                fill={getPlayerAtPosition(2) ? "#3b82f6" : "#dbeafe"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#1e40af"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 2)}
              />
              <text
                x="240"
                y="95"
                textAnchor="middle"
                className="text-2xl font-bold fill-slate-900 pointer-events-none"
              >
                {getPlayerAtPosition(2) || "II"}
              </text>
              <text
                x="240"
                y="115"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Ponta D
              </text>
            </g>

            {/* Back row (Fundo) - positions 1, 6, 5 */}
            <g>
              {/* Position 1 - Fundo E */}
              <circle
                cx="80"
                cy="280"
                r="28"
                fill={getPlayerAtPosition(1) ? "#10b981" : "#d1fae5"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#065f46"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 1)}
              />
              <text
                x="80"
                y="295"
                textAnchor="middle"
                className="text-2xl font-bold fill-slate-900 pointer-events-none"
              >
                {getPlayerAtPosition(1) || "I"}
              </text>
              <text
                x="80"
                y="315"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Fundo E
              </text>

              {/* Position 6 - Oposto */}
              <circle
                cx="160"
                cy="280"
                r="28"
                fill={getPlayerAtPosition(6) ? "#10b981" : "#d1fae5"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#065f46"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 6)}
              />
              <text
                x="160"
                y="295"
                textAnchor="middle"
                className="text-2xl font-bold fill-slate-900 pointer-events-none"
              >
                {getPlayerAtPosition(6) || "VI"}
              </text>
              <text
                x="160"
                y="315"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Oposto
              </text>

              {/* Position 5 - Saque */}
              <circle
                cx="240"
                cy="280"
                r="28"
                fill={getPlayerAtPosition(5) ? "#ef4444" : "#fee2e2"}
                stroke={selectedPlayer && selectedTeam === teamId ? "#fbbf24" : "#991b1b"}
                strokeWidth="3"
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePositionClick(teamId, 5)}
              />
              <text
                x="240"
                y="295"
                textAnchor="middle"
                className="text-2xl font-bold fill-slate-900 pointer-events-none"
              >
                {getPlayerAtPosition(5) || "V"}
              </text>
              <text
                x="240"
                y="315"
                textAnchor="middle"
                className="text-xs fill-slate-600 font-semibold pointer-events-none"
              >
                Saque
              </text>
            </g>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-4 bg-orange-50/50 rounded-lg">
      <Card className="p-4 bg-gradient-to-r from-orange-600 to-orange-500 border-orange-400">
        <h2 className="text-xl font-bold text-white mb-2">Como Usar o Rodízio</h2>
        <ol className="text-orange-50 space-y-1 list-decimal list-inside">
          <li>
            <strong>Selecione uma equipe</strong> (Equipe A ou B) clicando nela
          </li>
          <li>
            <strong>Clique no número do jogador</strong> abaixo (ficará amarelo)
          </li>
          <li>
            <strong>Clique na posição da quadra</strong> onde quer colocar o jogador
          </li>
          <li>Rotação automática acontece quando o saque muda de equipe</li>
        </ol>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => setSelectedTeam("A")}
          className={`px-8 py-6 text-lg font-bold transition-all ${
            selectedTeam === "A"
              ? "bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-400 scale-105 text-white"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
          }`}
        >
          {selectedTeam === "A" ? "✓ " : ""}EQUIPE A
        </Button>
        <Button
          onClick={() => setSelectedTeam("B")}
          className={`px-8 py-6 text-lg font-bold transition-all ${
            selectedTeam === "B"
              ? "bg-red-600 hover:bg-red-700 ring-4 ring-red-400 scale-105 text-white"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
          }`}
        >
          {selectedTeam === "B" ? "✓ " : ""}EQUIPE B
        </Button>
      </div>

      <Card className="p-6 bg-white border-orange-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Selecione o Número do Jogador
            {selectedPlayer && <span className="text-orange-600 ml-2">→ Jogador {selectedPlayer} selecionado</span>}
          </h3>
          {selectedPlayer && (
            <Button
              onClick={() => setSelectedPlayer(null)}
              size="sm"
              variant="outline"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-3">
          {availablePlayers.map((num) => (
            <button
              key={num}
              onClick={() => handlePlayerSelect(num)}
              className={`h-14 flex items-center justify-center text-xl font-bold rounded-lg transition-all ${
                selectedPlayer === num
                  ? "bg-orange-500 text-white ring-4 ring-orange-300 scale-110 shadow-lg"
                  : "bg-gradient-to-br from-orange-600 to-orange-700 text-white hover:from-orange-500 hover:to-orange-600 hover:scale-105 shadow-md cursor-pointer"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-4 text-center">
          {selectedPlayer
            ? `Agora clique na posição da EQUIPE ${selectedTeam} onde quer colocar o jogador ${selectedPlayer}`
            : "Clique em um número acima para começar"}
        </p>
      </Card>

      {/* Undo button */}
      {undoHistory.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleUndo}
            variant="outline"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            ← Desfazer Última Mudança
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          onClick={() => setSelectedTeam("A")}
          className={`cursor-pointer transition-all ${selectedTeam === "A" ? "ring-4 ring-blue-400 rounded-lg" : ""}`}
        >
          {renderCourt("A", teamARotation, "EQUIPE A", "bg-blue-600")}
        </div>
        <div
          onClick={() => setSelectedTeam("B")}
          className={`cursor-pointer transition-all ${selectedTeam === "B" ? "ring-4 ring-red-400 rounded-lg" : ""}`}
        >
          {renderCourt("B", teamBRotation, "EQUIPE B", "bg-red-600")}
        </div>
      </div>
    </div>
  )
}
