"use client"

import { useState } from "react"
import { Button } from "@/components/scout/ui/button"
import { Card } from "@/components/scout/ui/card"
import type { MatchAction } from "@/lib/scout/match-parser"
import type { Player } from "@/components/scout/team-roster-management"
import Face1Team from "./face1-team"
import Face2Player from "./face2-player"
import Face3Serve from "./face3-serve"
import Face4ServeZone from "./face4-serve-zone"
import Face5PassQuality from "./face5-pass-quality"
import Face6PassingPlayer from "./face6-passing-player"
import Face7AttackingTeam from "./face7-attacking-team"
import Face8AttackPosition from "./face8-attack-position"
import Face9ResultType from "./face9-result-type"
import Face10AttackingPlayer from "./face10-attacking-player"
import Face11BlockingPlayer from "./face11-blocking-player"
import Face12Transition from "./face12-transition"
import Face9DefensePlayer from "./face9-defense-player"
import Face5ReboundDecision from "./face5-rebound-decision"

interface EightFaceDataEntryProps {
  onActionComplete: (action: MatchAction) => void
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  teamAPlayers: Player[]
  teamBPlayers: Player[]
}

export default function EightFaceDataEntry({
  onActionComplete,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
}: EightFaceDataEntryProps) {
  const [currentFace, setCurrentFace] = useState(1)
  const [actionData, setActionData] = useState<Partial<MatchAction>>({
    servingTeam: "",
    servingPlayer: 0,
    serveQuality: "",
    serveZone: "",
    passingQuality: "",
    passingPlayer: 0,
    attackingTeam: "",
    attackPosition: "",
    resultComplemento: "",
    actionPlayer: 0,
    defensivePlayer: 0,
    transitionType: "k1",
    blockingPosition: "",
    blockingPlayer: 0,
  })

  const teamA = { 
    name: teamAName, 
    players: teamAPlayers.length > 0 ? teamAPlayers.map(p => p.number) : Array.from({ length: 14 }, (_, i) => i + 1)
  }
  const teamB = { 
    name: teamBName, 
    players: teamBPlayers.length > 0 ? teamBPlayers.map(p => p.number) : Array.from({ length: 14 }, (_, i) => i + 1)
  }

  const handleFaceComplete = (value: string | number) => {
    const newData = { ...actionData }

    switch (currentFace) {
      case 1:
        newData.servingTeam = value as string
        break
      case 2:
        newData.servingPlayer = value as number
        break
      case 3:
        newData.serveQuality = value as string
        if (value === "-" || value === "ka") {
          const action: MatchAction = {
            id: Math.random().toString(),
            timestamp: Date.now(),
            servingTeam: actionData.servingTeam as "A" | "B",
            servingPlayer: actionData.servingPlayer as number,
            serveQuality: value as "+" | "-" | "ka",
            attackingTeam: actionData.servingTeam === "A" ? "B" : "A",
          }
          console.log("[v0] Serve action:", action, "Quality:", value)
          onActionComplete(action)
          setCurrentFace(1)
          setActionData({
            servingTeam: "",
            servingPlayer: 0,
            serveQuality: "",
            serveZone: "",
            passingQuality: "",
            passingPlayer: 0,
            attackingTeam: "",
            attackPosition: "",
            resultComplemento: "",
            actionPlayer: 0,
            defensivePlayer: 0,
            transitionType: "k1",
            blockingPosition: "",
            blockingPlayer: 0,
          })
          return
        }
        break
      case 4:
        newData.serveZone = value as string
        break
      case 5:
        newData.passingQuality = value as string
        if (value === "D") {
          setActionData(newData)
          setCurrentFace(5.5)
          return
        }
        if (value === "R") {
          setActionData(newData)
          setCurrentFace(5.6) // identificar o passador do rebote
          return
        }
        break
      case 5.6:
        newData.passingPlayer = value as number
        setActionData(newData)
        setCurrentFace(5.65) // decidir se o rebote vira ponto ou defesa
        return
      case 5.65:
        if (value === "DEF") {
          setActionData(newData)
          setCurrentFace(5.7) // identificar quem defendeu o rebote (equipe adversária)
          return
        }
        // Ponto direto a partir do rebote: guarda a equipe que pontuou
        // e segue para identificar o jogador responsável pelo ponto.
        newData.pointScoredBy = value as "A" | "B"
        setActionData(newData)
        setCurrentFace(5.66)
        return
      case 5.66:
        // Identifica o jogador que fez o ponto a partir do rebote.
        // É contabilizado como ponto de bloqueio (coluna F/S) para esse jogador.
        const scoringTeam = actionData.pointScoredBy as "A" | "B"
        const reboundPointAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: "R",
          passingPlayer: actionData.passingPlayer as number,
          // attackingTeam é o oposto da equipe que pontuou, de modo que o
          // bloqueio (F/S) seja creditado ao jogador da equipe pontuadora.
          attackingTeam: scoringTeam === "A" ? "B" : "A",
          attackPosition: "F",
          blockingPlayer: value as number,
          pointScoredBy: scoringTeam,
          pointType: "point",
        }
        console.log("[v0] Pass rebound direct point action:", reboundPointAction)
        onActionComplete(reboundPointAction)
        setCurrentFace(1)
        setActionData({
          servingTeam: "",
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: 0,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
      case 5.7:
        // Rebote de passe: o passador (equipe receptora) comete erro de passe,
        // a equipe que sacou defende o rebote e inicia o ataque.
        const reboundAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: "R",
          passingPlayer: actionData.passingPlayer as number,
          defensivePlayer: value as number,
          // attackingTeam aqui representa quem originou a bola (equipe receptora),
          // assim a defesa é creditada à equipe que sacou.
          attackingTeam: actionData.servingTeam === "A" ? "B" : "A",
        }
        console.log("[v0] Pass rebound action:", reboundAction)
        onActionComplete(reboundAction)
        // A continuação é apenas o ataque da equipe que defendeu o rebote.
        // Os campos de saque e passe são limpos para não serem contabilizados
        // novamente (o saque e o erro de recepção já foram registrados acima).
        setActionData({
          servingTeam: actionData.servingTeam,
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: 0,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        setCurrentFace(7) // iniciar o ataque
        return
      case 5.5:
        newData.passingPlayer = value as number
        const passErrorAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: "D",
          passingPlayer: value as number,
          attackingTeam: actionData.servingTeam === "A" ? "B" : "A",
        }
        console.log("[v0] Pass error with player:", passErrorAction)
        onActionComplete(passErrorAction)
        setCurrentFace(1)
        setActionData({
          servingTeam: "",
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: 0,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
      case 6:
        newData.passingPlayer = value as number

        // Criar ação de recepção separada
        const receptionAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: actionData.passingQuality as "A" | "B" | "C" | "D",
          passingPlayer: value as number,
          attackingTeam: actionData.servingTeam === "A" ? "B" : "A",
        }

        console.log("[v0] Reception completed - Player:", value, "Quality:", actionData.passingQuality)
        onActionComplete(receptionAction)

        setActionData({
          servingTeam: "",
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: value as number,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          blockingPlayer: 0,
          blockingPosition: "",
          transitionType: "k1",
        })
        setCurrentFace(7)
        return
      case 7:
        newData.attackingTeam = value as string
        break
      case 8:
        if (value === "ERR_LEV") {
          newData.resultComplemento = "%"
          setActionData(newData)
          setCurrentFace(8.5) // identificar o levantador que errou
          return
        }
        newData.attackPosition = value as string
        break
      case 8.5:
        // Erro de levantamento: creditado como erro de ataque ao levantador,
        // ponto encerrado para a equipe adversária.
        const settingErrorAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: actionData.passingQuality as "A" | "B" | "C" | "D" | "R",
          passingPlayer: actionData.passingPlayer as number,
          attackingTeam: actionData.attackingTeam as "A" | "B",
          actionPlayer: value as number,
          resultComplemento: "%",
          pointScoredBy: actionData.attackingTeam === "A" ? "B" : "A",
          pointType: "error",
        }
        console.log("[v0] Setting error action:", settingErrorAction)
        onActionComplete(settingErrorAction)
        setCurrentFace(1)
        setActionData({
          servingTeam: "",
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: 0,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
      case 9:
        newData.resultComplemento = value as string
        if (value === "D" || value === "V") {
          // Defesa e Volume seguem o mesmo fluxo: identificar atacante e
          // depois o defensor adversário, retornando à face 7.
          setActionData(newData)
          setCurrentFace(9.1) // Face 9a: select attacker
          return
        } else if (value === "REC") {
          // Recuperação: bloqueio adversário (posição = posição do ataque),
          // mas a bola é defendida pela própria equipe atacante.
          setActionData(newData)
          setCurrentFace(9.3) // identificar atacante
          return
        } else {
          setActionData(newData)
          setCurrentFace(10)
          return
        }
        break
      case 9.3:
        newData.actionPlayer = value as number
        setActionData(newData)
        setCurrentFace(9.4) // identificar bloqueador adversário
        return
      case 9.4:
        newData.blockingPlayer = value as number
        // posição do bloqueio é a própria posição do ataque (pelo levantamento)
        newData.blockingPosition = actionData.attackPosition as string
        setActionData(newData)
        setCurrentFace(9.5) // identificar quem defendeu (própria equipe atacante)
        return
      case 9.5:
        newData.defensivePlayer = value as number
        const recoveryAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: actionData.passingQuality as "A" | "B" | "C" | "D",
          passingPlayer: actionData.passingPlayer as number,
          attackingTeam: actionData.attackingTeam as "A" | "B",
          attackPosition: actionData.attackPosition as "O" | "M" | "P" | "F" | "S",
          resultComplemento: "REC",
          actionPlayer: actionData.actionPlayer as number,
          blockingPlayer: actionData.blockingPlayer as number,
          blockingPosition: actionData.blockingPosition as string,
          defensivePlayer: value as number,
          transitionType: "k1",
        }
        console.log("[v0] Recovery action:", recoveryAction)
        onActionComplete(recoveryAction)
        setCurrentFace(7)
        setActionData({
          servingTeam: actionData.servingTeam,
          servingPlayer: actionData.servingPlayer,
          serveQuality: actionData.serveQuality,
          serveZone: actionData.serveZone,
          passingQuality: actionData.passingQuality,
          passingPlayer: actionData.passingPlayer,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
      case 9.1:
        newData.actionPlayer = value as number
        setActionData(newData)
        setCurrentFace(9.2) // Face 9b: select defender
        return
      case 9.2:
        newData.defensivePlayer = value as number
        const defenseAction: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: actionData.passingQuality as "A" | "B" | "C" | "D",
          passingPlayer: actionData.passingPlayer as number,
          attackingTeam: actionData.attackingTeam as "A" | "B",
          attackPosition: actionData.attackPosition as "O" | "M" | "P" | "F" | "S",
          resultComplemento: actionData.resultComplemento as "D" | "V",
          actionPlayer: newData.actionPlayer as number,
          defensivePlayer: value as number,
          blockingPlayer: 0,
          blockingPosition: "",
          transitionType: "k1",
        }
        console.log("[v0] Defense action with player:", defenseAction)
        onActionComplete(defenseAction)
        setCurrentFace(7)
        setActionData({
          servingTeam: actionData.servingTeam,
          servingPlayer: actionData.servingPlayer,
          serveQuality: actionData.serveQuality,
          serveZone: actionData.serveZone,
          passingQuality: actionData.passingQuality,
          passingPlayer: actionData.passingPlayer,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
      case 10:
        newData.actionPlayer = value as number
        if (actionData.resultComplemento === "+") {
          setActionData(newData)
          setCurrentFace(10.5)
          return
        } else {
          setActionData(newData)
          setCurrentFace(12)
          return
        }
        break
      case 10.5:
        newData.blockingPosition = value as string
        setActionData(newData)
        setCurrentFace(11)
        return
      case 11:
        newData.blockingPlayer = value as number
        setActionData(newData)
        setCurrentFace(12)
        return
      case 12:
        newData.transitionType = value as string
        const action: MatchAction = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          servingTeam: actionData.servingTeam as "A" | "B",
          servingPlayer: actionData.servingPlayer as number,
          serveQuality: actionData.serveQuality as "+" | "-" | "ka",
          serveZone: actionData.serveZone as "7.5" | "8.6" | "9.1",
          passingQuality: actionData.passingQuality as "A" | "B" | "C" | "D",
          passingPlayer: actionData.passingPlayer as number,
          attackingTeam: actionData.attackingTeam as "A" | "B",
          attackPosition: actionData.attackPosition as "O" | "M" | "P" | "F" | "S",
          resultComplemento: actionData.resultComplemento as "#" | "!" | "+",
          actionPlayer: actionData.actionPlayer as number,
          blockingPlayer: actionData.resultComplemento === "+" ? (actionData.blockingPlayer as number) : 0,
          blockingPosition: actionData.resultComplemento === "+" ? (actionData.blockingPosition as string) : "",
          defensivePlayer: actionData.defensivePlayer as number,
          transitionType: value as "k1" | "k2" | "k3",
        }
        console.log("[v0] Complete action:", action)
        onActionComplete(action)
        setCurrentFace(1)
        setActionData({
          servingTeam: "",
          servingPlayer: 0,
          serveQuality: "",
          serveZone: "",
          passingQuality: "",
          passingPlayer: 0,
          attackingTeam: "",
          attackPosition: "",
          resultComplemento: "",
          actionPlayer: 0,
          defensivePlayer: 0,
          transitionType: "k1",
          blockingPosition: "",
          blockingPlayer: 0,
        })
        return
    }

    setActionData(newData)
    setCurrentFace(currentFace + 1)
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4">
      <div className="w-full max-w-2xl mx-auto mb-4 p-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg shadow-lg">
        <div className="flex justify-between items-center text-white">
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold">{teamAName}</h2>
            <p className="text-4xl font-bold">{teamAScore}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-lg font-bold">
              Face{" "}
              {currentFace === 5.5
                ? "5a"
                : currentFace === 5.6
                  ? "5b"
                  : currentFace === 5.65
                    ? "5b+"
                    : currentFace === 5.66
                      ? "5b++"
                      : currentFace === 5.7
                    ? "5c"
                    : currentFace === 8.5
                      ? "8a"
                      : currentFace === 9.1
                      ? "9a"
                      : currentFace === 9.2
                        ? "9b"
                        : currentFace === 9.3
                          ? "9c"
                          : currentFace === 9.4
                            ? "9d"
                            : currentFace === 9.5
                              ? "9e"
                              : currentFace === 10.5
                          ? "10a"
                          : currentFace}{" "}
              de 12
            </p>
          </div>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold">{teamBName}</h2>
            <p className="text-4xl font-bold">{teamBScore}</p>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-2xl mx-auto p-8 bg-white shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Coleta de Dados - Voleibol</h1>
        </div>

        <div className="mb-8 p-4 bg-orange-50 rounded-lg border border-orange-200">
          {currentFace === 1 && <Face1Team onSelect={handleFaceComplete} teamNames={["A", "B"]} />}
          {currentFace === 2 && (
            <Face2Player
              onSelect={handleFaceComplete}
              team={actionData.servingTeam === "A" ? teamA : teamB}
              context="Número do sacador"
            />
          )}
          {currentFace === 3 && <Face3Serve onSelect={handleFaceComplete} />}
          {currentFace === 4 && <Face4ServeZone onSelect={handleFaceComplete} />}
          {currentFace === 5 && <Face5PassQuality onSelect={handleFaceComplete} />}
          {currentFace === 5.5 && (
            <Face6PassingPlayer
              onSelect={handleFaceComplete}
              team={actionData.servingTeam === "A" ? teamB : teamA}
              context="Número do jogador que errou o passe"
            />
          )}
          {currentFace === 5.6 && (
            <Face6PassingPlayer
              onSelect={handleFaceComplete}
              team={actionData.servingTeam === "A" ? teamB : teamA}
              context="Número do passador (rebote de passe)"
            />
          )}
          {currentFace === 5.65 && (
            <Face5ReboundDecision
              onSelect={handleFaceComplete}
              teamAName={teamAName}
              teamBName={teamBName}
            />
          )}
          {currentFace === 5.66 && (
            <Face10AttackingPlayer
              onSelect={handleFaceComplete}
              team={actionData.pointScoredBy === "A" ? teamA : teamB}
              context="Número do jogador que fez o ponto"
            />
          )}
          {currentFace === 5.7 && (
            <Face9DefensePlayer
              onSelect={handleFaceComplete}
              team={actionData.servingTeam === "A" ? teamA : teamB}
              context="Quem defendeu o rebote (equipe adversária)"
            />
          )}
          {currentFace === 6 && (
            <Face6PassingPlayer
              onSelect={handleFaceComplete}
              team={actionData.servingTeam === "A" ? teamB : teamA}
              context="Número do passador"
            />
          )}
          {currentFace === 7 && <Face7AttackingTeam onSelect={handleFaceComplete} teamNames={["A", "B"]} />}
          {currentFace === 8 && <Face8AttackPosition onSelect={handleFaceComplete} />}
          {currentFace === 8.5 && (
            <Face10AttackingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamA : teamB}
              context="Número do levantador que errou"
            />
          )}
          {currentFace === 9 && <Face9ResultType onSelect={handleFaceComplete} />}
          {currentFace === 9.1 && (
            <Face10AttackingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamA : teamB}
              context="Número do atacante"
            />
          )}
          {currentFace === 9.2 && (
            <Face9DefensePlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamB : teamA}
              context="Número do defensor"
            />
          )}
          {currentFace === 9.3 && (
            <Face10AttackingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamA : teamB}
              context="Número do atacante (recuperação)"
            />
          )}
          {currentFace === 9.4 && (
            <Face11BlockingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamB : teamA}
              context="Número do bloqueador adversário"
            />
          )}
          {currentFace === 9.5 && (
            <Face9DefensePlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamA : teamB}
              context="Quem defendeu a recuperação (própria equipe)"
            />
          )}
          {currentFace === 10 && (
            <Face10AttackingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamA : teamB}
              context={actionData.resultComplemento === "+" ? "Número do atacante (bloqueio)" : "Número do atacante"}
            />
          )}
          {currentFace === 10.5 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Posição do Bloqueio</h2>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => handleFaceComplete("P")} className="h-12 text-lg" variant="outline">
                  P - Ponta
                </Button>
                <Button onClick={() => handleFaceComplete("M")} className="h-12 text-lg" variant="outline">
                  M - Meio
                </Button>
                <Button onClick={() => handleFaceComplete("O")} className="h-12 text-lg" variant="outline">
                  O - Oposto
                </Button>
              </div>
            </div>
          )}
          {currentFace === 11 && (
            <Face11BlockingPlayer
              onSelect={handleFaceComplete}
              team={actionData.attackingTeam === "A" ? teamB : teamA}
              context="Número do bloqueador"
            />
          )}
          {currentFace === 12 && <Face12Transition onSelect={handleFaceComplete} />}
        </div>

        <div className="flex justify-between">
          <Button
            onClick={() => {
              if (currentFace > 1) setCurrentFace(currentFace - 1)
            }}
            variant="outline"
            disabled={currentFace === 1}
          >
            Anterior
          </Button>
          <Button onClick={() => setCurrentFace(1)} variant="outline">
            Limpar
          </Button>
        </div>
      </Card>
    </div>
  )
}
