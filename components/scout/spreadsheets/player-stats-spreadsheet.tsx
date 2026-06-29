"use client"

import { useState } from "react"
import type { MatchAction } from "@/lib/scout/match-parser"
import { calculatePlayerStats as calcPlayerStats, type PlayerStats } from "@/lib/scout/player-stats"
import { Card } from "@/components/scout/ui/card"
import { Button } from "@/components/scout/ui/button"
import { Download, Printer } from 'lucide-react'
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface PlayerStatsSpreadsheetProps {
  actions: MatchAction[]
  teamAName: string
  teamBName: string
}

export default function PlayerStatsSpreadsheet({ actions, teamAName, teamBName }: PlayerStatsSpreadsheetProps) {
  const [playerNames, setPlayerNames] = useState<Record<string, Record<number, string>>>({
    A: {},
    B: {},
  })

  const [playerPositions, setPlayerPositions] = useState<Record<string, Record<number, string>>>({
    A: {},
    B: {},
  })

  const [selectedSet, setSelectedSet] = useState<"all" | number>("all")

  const updatePlayerName = (team: "A" | "B", playerNumber: number, name: string) => {
    setPlayerNames((prev) => ({
      ...prev,
      [team]: {
        ...prev[team],
        [playerNumber]: name,
      },
    }))
  }

  const updatePlayerPosition = (team: "A" | "B", playerNumber: number, position: string) => {
    setPlayerPositions((prev) => ({
      ...prev,
      [team]: {
        ...prev[team],
        [playerNumber]: position,
      },
    }))
  }

  const calculatePlayerStats = (team: "A" | "B"): PlayerStats[] =>
    calcPlayerStats(actions, team, { selectedSet, playerNames, playerPositions })

  const exportTeamToPDF = async (team: "A" | "B") => {
    const doc = new jsPDF({ orientation: "landscape" })
    const stats = calculatePlayerStats(team)
    const teamName = team === "A" ? teamAName : teamBName

    doc.setFontSize(16)
    doc.text(`${teamAName} vs ${teamBName}`, 14, 10)
    doc.setFontSize(12)
    doc.text(`${teamName} - ${selectedSet === "all" ? "Todos os Sets" : `Set ${selectedSet}`}`, 14, 17)

    const tableData = stats.map((stat) => [
      stat.number,
      stat.position,
      stat.name || `Jogador ${stat.number}`,
      stat.reception.A,
      stat.reception.B,
      stat.reception.C,
      stat.reception.erro,
      stat.serve.certo,
      stat.serve.erro,
      stat.serve.ace,
      stat.attack.ponto,
      stat.attack.certo,
      stat.attack.erro,
      stat.attack.O,
      stat.attack.P,
      stat.attack.M,
      stat.attack.FS,
      stat.block.O,
      stat.block.P,
      stat.block.M,
      stat.block.FS,
      stat.defense.D,
      stat.defense.V,
      stat.defense.R,
      stat.tp,
      stat.te,
      `${stat.tgp}%`,
    ])

    autoTable(doc, {
      startY: 22,
      head: [
        [
          { content: "Nº", rowSpan: 2 },
          { content: "P#", rowSpan: 2 },
          { content: "NOME", rowSpan: 2 },
          { content: "RECEPÇÃO", colSpan: 4 },
          { content: "SAQUE", colSpan: 3 },
          { content: "ATAQUE", colSpan: 7 },
          { content: "BLOQUEIO", colSpan: 4 },
          { content: "DEFESA", colSpan: 3 },
          { content: "TP", rowSpan: 2 },
          { content: "TE", rowSpan: 2 },
          { content: "TGP", rowSpan: 2 },
        ],
        ["A", "B", "C", "ERRO", "CERTO", "ERRO", "ACE", "PONTO", "CERTO", "ERRO", "O", "P", "M", "F/S", "O", "P", "M", "F/S", "D", "V", "R"],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontSize: 8,
        halign: 'center',
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
    })

    doc.save(`${teamName}_stats.pdf`)
  }

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" })

    doc.setFontSize(16)
    doc.text(`${teamAName} vs ${teamBName}`, 14, 10)
    
    const statsA = calculatePlayerStats("A")
    doc.setFontSize(12)
    doc.text(`${teamAName} - ${selectedSet === "all" ? "Todos os Sets" : `Set ${selectedSet}`}`, 14, 17)

    const tableDataA = statsA.map((stat) => [
      stat.number,
      stat.position,
      stat.name || `Jogador ${stat.number}`,
      stat.reception.A,
      stat.reception.B,
      stat.reception.C,
      stat.reception.erro,
      stat.serve.certo,
      stat.serve.erro,
      stat.serve.ace,
      stat.attack.ponto,
      stat.attack.certo,
      stat.attack.erro,
      stat.attack.O,
      stat.attack.P,
      stat.attack.M,
      stat.attack.FS,
      stat.block.O,
      stat.block.P,
      stat.block.M,
      stat.block.FS,
      stat.defense.D,
      stat.defense.V,
      stat.defense.R,
      stat.tp,
      stat.te,
      `${stat.tgp}%`,
    ])

    autoTable(doc, {
      startY: 22,
      head: [
        [
          { content: "Nº", rowSpan: 2 },
          { content: "P#", rowSpan: 2 },
          { content: "NOME", rowSpan: 2 },
          { content: "RECEPÇÃO", colSpan: 4 },
          { content: "SAQUE", colSpan: 3 },
          { content: "ATAQUE", colSpan: 7 },
          { content: "BLOQUEIO", colSpan: 4 },
          { content: "DEFESA", colSpan: 3 },
          { content: "TP", rowSpan: 2 },
          { content: "TE", rowSpan: 2 },
          { content: "TGP", rowSpan: 2 },
        ],
        ["A", "B", "C", "ERRO", "CERTO", "ERRO", "ACE", "PONTO", "CERTO", "ERRO", "O", "P", "M", "F/S", "O", "P", "M", "F/S", "D", "V", "R"],
      ],
      body: tableDataA,
      theme: "grid",
      styles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontSize: 8,
        halign: 'center',
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
    })

    const statsB = calculatePlayerStats("B")
    doc.addPage()
    doc.setFontSize(16)
    doc.text(`${teamAName} vs ${teamBName}`, 14, 10)
    doc.setFontSize(12)
    doc.text(`${teamBName} - ${selectedSet === "all" ? "Todos os Sets" : `Set ${selectedSet}`}`, 14, 17)

    const tableDataB = statsB.map((stat) => [
      stat.number,
      stat.position,
      stat.name || `Jogador ${stat.number}`,
      stat.reception.A,
      stat.reception.B,
      stat.reception.C,
      stat.reception.erro,
      stat.serve.certo,
      stat.serve.erro,
      stat.serve.ace,
      stat.attack.ponto,
      stat.attack.certo,
      stat.attack.erro,
      stat.attack.O,
      stat.attack.P,
      stat.attack.M,
      stat.attack.FS,
      stat.block.O,
      stat.block.P,
      stat.block.M,
      stat.block.FS,
      stat.defense.D,
      stat.defense.V,
      stat.defense.R,
      stat.tp,
      stat.te,
      `${stat.tgp}%`,
    ])

    autoTable(doc, {
      startY: 22,
      head: [
        [
          { content: "Nº", rowSpan: 2 },
          { content: "P#", rowSpan: 2 },
          { content: "NOME", rowSpan: 2 },
          { content: "RECEPÇÃO", colSpan: 4 },
          { content: "SAQUE", colSpan: 3 },
          { content: "ATAQUE", colSpan: 7 },
          { content: "BLOQUEIO", colSpan: 4 },
          { content: "DEFESA", colSpan: 3 },
          { content: "TP", rowSpan: 2 },
          { content: "TE", rowSpan: 2 },
          { content: "TGP", rowSpan: 2 },
        ],
        ["A", "B", "C", "ERRO", "CERTO", "ERRO", "ACE", "PONTO", "CERTO", "ERRO", "O", "P", "M", "F/S", "O", "P", "M", "F/S", "D", "V", "R"],
      ],
      body: tableDataB,
      theme: "grid",
      styles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontSize: 8,
        halign: 'center',
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
    })

    doc.save(`${teamAName}_vs_${teamBName}_stats.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  const renderTeamTable = (team: "A" | "B", teamName: string) => {
    const stats = calculatePlayerStats(team)
    const bgColor = team === "A" ? "bg-blue-50" : "bg-red-50"
    const headerColor = team === "A" ? "bg-blue-600" : "bg-red-600"
    const teamClass = team === "B" ? "team-b" : ""

    const totals = stats.reduce(
      (acc, stat) => ({
        reception: {
          A: acc.reception.A + stat.reception.A,
          B: acc.reception.B + stat.reception.B,
          C: acc.reception.C + stat.reception.C,
          erro: acc.reception.erro + stat.reception.erro,
        },
        serve: {
          certo: acc.serve.certo + stat.serve.certo,
          erro: acc.serve.erro + stat.serve.erro,
          ace: acc.serve.ace + stat.serve.ace,
        },
        attack: {
          ponto: acc.attack.ponto + stat.attack.ponto,
          certo: acc.attack.certo + stat.attack.certo,
          erro: acc.attack.erro + stat.attack.erro,
          O: acc.attack.O + stat.attack.O,
          P: acc.attack.P + stat.attack.P,
          M: acc.attack.M + stat.attack.M,
          FS: acc.attack.FS + stat.attack.FS,
        },
        block: {
          O: acc.block.O + stat.block.O,
          P: acc.block.P + stat.block.P,
          M: acc.block.M + stat.block.M,
          FS: acc.block.FS + stat.block.FS,
        },
        defense: {
          D: acc.defense.D + stat.defense.D,
          V: acc.defense.V + stat.defense.V,
          R: acc.defense.R + stat.defense.R,
        },
        tp: acc.tp + stat.tp,
        te: acc.te + stat.te,
      }),
      {
        reception: { A: 0, B: 0, C: 0, erro: 0 },
        serve: { certo: 0, erro: 0, ace: 0 },
        attack: { ponto: 0, certo: 0, erro: 0, O: 0, P: 0, M: 0, FS: 0 },
        block: { O: 0, P: 0, M: 0, FS: 0 },
        defense: { D: 0, V: 0, R: 0 },
        tp: 0,
        te: 0,
      },
    )

    return (
      <Card className={`overflow-hidden p-4 ${bgColor}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={`text-xl font-bold team-title`}>{teamName}</h2>
          <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-semibold">{setLabel}</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className={`w-full text-xs border-collapse ${teamClass}`}>
            <thead>
              <tr className={`${headerColor} text-white`}>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  Nº
                </th>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  P#
                </th>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  NOME
                </th>
                <th className="border border-gray-300 p-1" colSpan={4}>
                  RECEPÇÃO
                </th>
                <th className="border border-gray-300 p-1" colSpan={3}>
                  SAQUE
                </th>
                <th className="border border-gray-300 p-1" colSpan={7}>
                  ATAQUE
                </th>
                <th className="border border-gray-300 p-1" colSpan={4}>
                  BLOQUEIO
                </th>
                <th className="border border-gray-300 p-1" colSpan={3}>
                  DEFESA
                </th>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  TP
                </th>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  TE
                </th>
                <th className="border border-gray-300 p-1" rowSpan={2}>
                  TGP
                </th>
              </tr>
              <tr className={`${headerColor} text-white`}>
                <th className="border border-gray-300 p-1">A</th>
                <th className="border border-gray-300 p-1">B</th>
                <th className="border border-gray-300 p-1">C</th>
                <th className="border border-gray-300 p-1">ERRO</th>
                <th className="border border-gray-300 p-1">CERTO</th>
                <th className="border border-gray-300 p-1">ERRO</th>
                <th className="border border-gray-300 p-1">ACE</th>
                <th className="border border-gray-300 p-1">PONTO</th>
                <th className="border border-gray-300 p-1">CERTO</th>
                <th className="border border-gray-300 p-1">ERRO</th>
                <th className="border border-gray-300 p-1">O</th>
                <th className="border border-gray-300 p-1">P</th>
                <th className="border border-gray-300 p-1">M</th>
                <th className="border border-gray-300 p-1">F/S</th>
                <th className="border border-gray-300 p-1">O</th>
                <th className="border border-gray-300 p-1">P</th>
                <th className="border border-gray-300 p-1">M</th>
                <th className="border border-gray-300 p-1">F/S</th>
                <th className="border border-gray-300 p-1">D</th>
                <th className="border border-gray-300 p-1">V</th>
                <th className="border border-gray-300 p-1">R</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.number} className="hover:bg-white/50">
                  <td className="border border-gray-300 p-1 text-center font-bold">{stat.number}</td>
                  <td className="border border-gray-300 p-1 text-center">
                    <input
                      type="text"
                      value={playerPositions[team]?.[stat.number] || stat.position || ""}
                      onChange={(e) => updatePlayerPosition(team, stat.number, e.target.value)}
                      className="w-8 text-center border-0 bg-transparent"
                      placeholder="-"
                    />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <input
                      type="text"
                      value={stat.name}
                      onChange={(e) => updatePlayerName(team, stat.number, e.target.value)}
                      placeholder="Nome do atleta"
                      className="w-full border-0 bg-transparent px-1"
                    />
                  </td>
                  <td className="border border-gray-300 p-1 text-center">{stat.reception.A}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.reception.B}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.reception.C}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.reception.erro}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.serve.certo}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.serve.erro}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.serve.ace}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.ponto}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.certo}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.erro}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.O}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.P}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.M}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.attack.FS}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.block.O}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.block.P}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.block.M}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.block.FS}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.defense.D}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.defense.V}</td>
                  <td className="border border-gray-300 p-1 text-center">{stat.defense.R}</td>
                  <td className="border border-gray-300 p-1 text-center font-bold">{stat.tp}</td>
                  <td className="border border-gray-300 p-1 text-center font-bold">{stat.te}</td>
                  <td className="border border-gray-300 p-1 text-center font-bold bg-yellow-200">{stat.tgp}%</td>
                </tr>
              ))}
              <tr className="bg-yellow-100 font-bold">
                <td className="border border-gray-300 p-1 text-center" colSpan={3}>
                  {selectedSet === "all" ? "RESULTADO GERAL" : `RESULTADO SET ${selectedSet}`}
                </td>
                <td className="border border-gray-300 p-1 text-center">{totals.reception.A}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.reception.B}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.reception.C}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.reception.erro}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.serve.certo}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.serve.erro}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.serve.ace}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.ponto}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.certo}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.erro}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.O}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.P}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.M}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.attack.FS}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.block.O}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.block.P}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.block.M}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.block.FS}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.defense.D}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.defense.V}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.defense.R}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.tp}</td>
                <td className="border border-gray-300 p-1 text-center">{totals.te}</td>
                <td className="border border-gray-300 p-1 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  // Sets que efetivamente possuem ações coletadas
  const availableSets = Array.from(
    new Set(actions.map((a) => a.setNumber).filter((n): n is number => typeof n === "number")),
  ).sort((a, b) => a - b)

  const setLabel = selectedSet === "all" ? "Todos os Sets" : `Set ${selectedSet}`

  const filteredActionsCount =
    selectedSet === "all" ? actions.length : actions.filter((a) => a.setNumber === selectedSet).length

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 no-print sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visualizar</span>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setSelectedSet("all")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSet === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {(availableSets.length > 0 ? availableSets : [1]).map((setNum) => (
              <button
                key={setNum}
                type="button"
                onClick={() => setSelectedSet(setNum)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedSet === setNum
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Set {setNum}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={() => exportTeamToPDF("A")} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            PDF {teamAName}
          </Button>
          <Button onClick={() => exportTeamToPDF("B")} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            PDF {teamBName}
          </Button>
          <Button onClick={exportToPDF} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            PDF Ambos
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 no-print">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {setLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          {filteredActionsCount} {filteredActionsCount === 1 ? "ação registrada" : "ações registradas"}
        </span>
      </div>

      <div id="spreadsheet-content" className="space-y-6">
        {renderTeamTable("A", teamAName)}
        {renderTeamTable("B", teamBName)}
      </div>
    </div>
  )
}
