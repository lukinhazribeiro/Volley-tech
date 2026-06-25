"use client"
import { Trophy, FileText, Users, Clock, AlertTriangle } from "lucide-react"

type Player = {
  number: number
  name: string
  isLibero: boolean
  isCaptain: boolean
}

type Team = {
  name: string
  players: Player[]
  formation: (Player | null)[]
  activeLibero: Player | null
  score: number
  serving: boolean
  sets: number
  timeouts: number
  penalties: Penalty[]
}

type Substitution = {
  setNumber: number
  team: "A" | "B"
  playerOut: Player
  playerIn: Player
  timestamp: Date
}

type Timeout = {
  setNumber: number
  team: "A" | "B"
  scoreA: number
  scoreB: number
  timestamp: Date
}

type Penalty = {
  setNumber: number
  team: "A" | "B"
  type: "yellow" | "red"
  scoreA: number
  scoreB: number
  timestamp: Date
}

type SetResult = {
  setNumber: number
  teamAScore: number
  teamBScore: number
  winner: "A" | "B"
  teamAFormation: (Player | null)[]
  teamBFormation: (Player | null)[]
  substitutions: Substitution[]
  timeouts: Timeout[]
  penalties: Penalty[]
}

interface GameReportProps {
  teamA: Team
  teamB: Team
  setHistory: SetResult[]
  championshipName?: string
}

export function GameReport({ teamA, teamB, setHistory, championshipName }: GameReportProps) {
  const totalSetsA = setHistory.filter((set) => set.winner === "A").length
  const totalSetsB = setHistory.filter((set) => set.winner === "B").length

  const winner = totalSetsA > totalSetsB ? teamA : teamB
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const handlePrint = () => {
    const printContent = document.getElementById("game-report")
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Súmula - ${teamA.name} x ${teamB.name}</title>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
            body { background: white; padding: 10px; }
            .no-print { display: none !important; }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: center;">
            <button onclick="window.print()" style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
              Imprimir
            </button>
            <button onclick="exportPDF()" style="background: #16a34a; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
              Exportar PDF
            </button>
          </div>
          <p class="no-print" style="text-align: center; margin-bottom: 15px; font-size: 14px; color: #666;">
            Clique em "Exportar PDF" e selecione "Salvar como PDF" na impressora para gerar o arquivo.
          </p>
          ${printContent.outerHTML}
          <script>
            function exportPDF() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <>
      <div className="print:hidden mb-4 text-center space-y-2">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 mx-auto"
        >
          <FileText className="size-5" />
          Abrir Documento da Súmula
        </button>
        <p className="text-sm text-gray-600">Uma nova janela abrirá com opções para imprimir ou exportar PDF</p>
      </div>

      <div id="game-report" className="bg-white text-black max-w-[1600px] mx-auto">
        <div className="p-6 print:p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-black">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h1 className="text-xl font-bold uppercase">Súmula de Jogo</h1>
              </div>
              <p className="text-[9px] text-gray-600 mt-0.5">Voleibol - Registro Oficial da Partida</p>
              <p className="text-[9px] text-gray-500">Data: {currentDate}</p>
              {championshipName && (
                <div className="mt-0.5 inline-block bg-yellow-100 border border-yellow-500 rounded px-1.5 py-0.5 text-[9px] font-semibold">
                  {championshipName}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">VOLLEY TECH</div>
            </div>
          </div>

          {/* Primeira Linha: Equipes e Resultado */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            {/* Team A (col-span-4) */}
            <div className="col-span-4">
              <div className="border-2 border-black rounded p-2">
                <h2 className="text-base font-bold text-center mb-1.5 pb-1 border-b">{teamA.name}</h2>

                {/* Formação Inicial - Compacta */}
                <div className="mb-2">
                  <h3 className="font-bold text-[9px] mb-1 uppercase">Formação Inicial:</h3>
                  <div className="grid grid-cols-3 gap-0.5 text-[8px]">
                    {[3, 2, 1].map((posIdx) => {
                      const player = teamA.formation[posIdx]
                      return (
                        <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-gray-50">
                          <div className="font-bold text-[7px]">P{posIdx + 1}</div>
                          {player && (
                            <>
                              <div className="font-semibold">#{player.number}</div>
                              <div className="truncate text-[7px]">{player.name.split(" ")[0]}</div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    {[4, 5, 0].map((posIdx) => {
                      const player = teamA.formation[posIdx]
                      return (
                        <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-gray-50">
                          <div className="font-bold text-[7px]">P{posIdx + 1}</div>
                          {player && (
                            <>
                              <div className="font-semibold">#{player.number}</div>
                              <div className="truncate text-[7px]">{player.name.split(" ")[0]}</div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Elenco Completo - Compacto */}
                <div>
                  <h3 className="font-bold text-[9px] mb-0.5 uppercase">Elenco:</h3>
                  <div className="text-[8px] space-y-0.5">
                    {teamA.players
                      .filter((p) => p.name.trim() !== "" && p.number > 0)
                      .map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="font-bold">#{player.number}</span>
                          <span className="flex-1 truncate">{player.name}</span>
                          {player.isLibero && <span className="text-red-600 font-bold text-[7px]">(L)</span>}
                          {player.isCaptain && <span className="text-blue-600 font-bold text-[7px]">(C)</span>}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado (col-span-4) */}
            <div className="col-span-4">
              <div className="border-2 border-black rounded p-2">
                <h3 className="text-center font-bold text-sm mb-1.5">Resultado da Partida</h3>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-center">
                    <div className="text-[10px] font-semibold">{teamA.name}</div>
                    <div className="text-4xl font-bold">{totalSetsA}</div>
                  </div>
                  <div className="text-center">
                    <Trophy className="w-7 h-7 mx-auto text-yellow-500" />
                    <div className="text-[9px] font-bold mt-0.5">SETS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-semibold">{teamB.name}</div>
                    <div className="text-4xl font-bold">{totalSetsB}</div>
                  </div>
                </div>
                <div className="text-center text-[10px] font-bold mb-1.5 bg-yellow-100 py-1 rounded">
                  VENCEDOR: {winner.name}
                </div>

                <div className="border-t mt-2 pt-2">
                  <h3 className="text-center font-bold text-[9px] mb-1">Assinaturas</h3>
                  <div className="grid grid-cols-2 gap-2 text-[8px]">
                    <div>
                      <div className="font-semibold mb-0.5">Técnico - {teamA.name}</div>
                      <div className="border-b border-black h-5"></div>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Técnico - {teamB.name}</div>
                      <div className="border-b border-black h-5"></div>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Capitão - {teamA.name}</div>
                      <div className="border-b border-black h-5"></div>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Capitão - {teamB.name}</div>
                      <div className="border-b border-black h-5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team B (col-span-4) */}
            <div className="col-span-4">
              <div className="border-2 border-black rounded p-2">
                <h2 className="text-base font-bold text-center mb-1.5 pb-1 border-b">{teamB.name}</h2>

                {/* Formação Inicial - Compacta */}
                <div className="mb-2">
                  <h3 className="font-bold text-[9px] mb-1 uppercase">Formação Inicial:</h3>
                  <div className="grid grid-cols-3 gap-0.5 text-[8px]">
                    {[3, 2, 1].map((posIdx) => {
                      const player = teamB.formation[posIdx]
                      return (
                        <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-gray-50">
                          <div className="font-bold text-[7px]">P{posIdx + 1}</div>
                          {player && (
                            <>
                              <div className="font-semibold">#{player.number}</div>
                              <div className="truncate text-[7px]">{player.name.split(" ")[0]}</div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    {[4, 5, 0].map((posIdx) => {
                      const player = teamB.formation[posIdx]
                      return (
                        <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-gray-50">
                          <div className="font-bold text-[7px]">P{posIdx + 1}</div>
                          {player && (
                            <>
                              <div className="font-semibold">#{player.number}</div>
                              <div className="truncate text-[7px]">{player.name.split(" ")[0]}</div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Elenco Completo - Compacto */}
                <div>
                  <h3 className="font-bold text-[9px] mb-0.5 uppercase">Elenco:</h3>
                  <div className="text-[8px] space-y-0.5">
                    {teamB.players
                      .filter((p) => p.name.trim() !== "" && p.number > 0)
                      .map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="font-bold">#{player.number}</span>
                          <span className="flex-1 truncate">{player.name}</span>
                          {player.isLibero && <span className="text-red-600 font-bold text-[7px]">(L)</span>}
                          {player.isCaptain && <span className="text-blue-600 font-bold text-[7px]">(C)</span>}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {setHistory.map((set, idx) => (
              <div key={idx} className="border-2 border-black rounded p-2 bg-gray-50">
                <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-gray-300">
                  <span className="text-[10px] font-bold">{idx + 1}º SET</span>
                  <span className="text-sm font-bold">
                    {set.teamAScore} × {set.teamBScore}
                  </span>
                  <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded">
                    {set.winner === "A" ? teamA.name : teamB.name}
                  </span>
                </div>

                {/* Formações lado a lado - ultra compacto */}
                {set.teamAFormation && set.teamBFormation && (
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div>
                      <div className="text-[7px] font-semibold mb-0.5">Formação - {teamA.name}</div>
                      <div className="grid grid-cols-3 gap-0.5 text-[7px]">
                        {[3, 2, 1, 4, 5, 0].map((posIdx) => {
                          const p = set.teamAFormation[posIdx]
                          return (
                            <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-white">
                              {p && <div className="font-semibold">#{p.number}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[7px] font-semibold mb-0.5">Formação - {teamB.name}</div>
                      <div className="grid grid-cols-3 gap-0.5 text-[7px]">
                        {[3, 2, 1, 4, 5, 0].map((posIdx) => {
                          const p = set.teamBFormation[posIdx]
                          return (
                            <div key={posIdx} className="border border-gray-300 p-0.5 text-center bg-white">
                              {p && <div className="font-semibold">#{p.number}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Substituições */}
                {set.substitutions && set.substitutions.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[8px] font-semibold mb-0.5 flex items-center gap-0.5">
                      <Users className="w-2 h-2" />
                      Substituições ({set.substitutions.length})
                    </div>
                    <div className="space-y-0.5 text-[7px]">
                      {set.substitutions.map((sub, i) => (
                        <div key={i} className="bg-blue-50 p-0.5 rounded">
                          <span className="font-semibold">{sub.team === "A" ? teamA.name : teamB.name}:</span> #
                          {sub.playerOut.number} → #{sub.playerIn.number}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tempos Técnicos */}
                {set.timeouts && set.timeouts.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[8px] font-semibold mb-0.5 flex items-center gap-0.5">
                      <Clock className="w-2 h-2" />
                      Tempos ({set.timeouts.length})
                    </div>
                    <div className="space-y-0.5 text-[7px]">
                      {set.timeouts.map((timeout, i) => (
                        <div key={i} className="bg-amber-50 p-0.5 rounded">
                          <span className="font-semibold">{timeout.team === "A" ? teamA.name : teamB.name}</span> -{" "}
                          {timeout.scoreA}×{timeout.scoreB}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Penalidades */}
                {set.penalties && set.penalties.length > 0 && (
                  <div>
                    <div className="text-[8px] font-semibold mb-0.5 flex items-center gap-0.5">
                      <AlertTriangle className="w-2 h-2" />
                      Penalidades ({set.penalties.length})
                    </div>
                    <div className="space-y-0.5 text-[7px]">
                      {set.penalties.map((penalty, i) => (
                        <div key={i} className="bg-red-50 p-0.5 rounded">
                          <span className="font-semibold">{penalty.team === "A" ? teamA.name : teamB.name}:</span>{" "}
                          {penalty.type === "yellow" ? "Amarelo" : "Vermelho"} - {penalty.scoreA}×{penalty.scoreB}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <p className="text-[7px] text-center text-gray-500 mt-2">
            Documento gerado pelo Sistema Volley Tech em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    </>
  )
}
