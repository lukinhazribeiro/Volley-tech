"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/scout/ui/button"
import { Card } from "@/components/scout/ui/card"
import { Trash2, Undo2, Zap } from "lucide-react"
import type { MatchAction } from "@/lib/scout/match-parser"
import type { Player } from "@/components/scout/team-roster-management"
import FormationSetup from "./formation-setup"
import {
  type CourtPos,
  type Formation,
  type TeamSetup,
  type Fundamento,
  type Touch,
  type AttackToken,
  type AttackDirection,
  FUNDAMENTO_LABEL,
  applyLibero,
  rotateFormation,
  findSetter,
  findPosition,
  attackTokenToOrigin,
  inferAttackDirection,
  possibleDirections,
  finalizeRally,
  describeSystem,
  BACK_ROW,
} from "@/lib/scout/smart-collector"

interface SmartDataEntryProps {
  onActionComplete: (action: MatchAction) => void
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  teamAPlayers: Player[]
  teamBPlayers: Player[]
  onRallyExtras?: (extras: unknown) => void
}

const FUNDAMENTOS: Fundamento[] = ["S", "P", "L", "A", "B", "D"]

interface LogEntry {
  id: string
  team: "A" | "B"
  label: string
  detail: string
  time: string
}

/** Deriva o token de ataque a partir da função + posição do atleta. */
function attackTokenFor(role: string | undefined, pos: CourtPos | null): AttackToken {
  if (pos && BACK_ROW.includes(pos)) return "F" // ataque de fundo / pipe
  if (role === "central") return "M"
  if (role === "oposto") return "O"
  if (role === "levantador") return "S"
  return "P" // ponteiro / padrão
}

export default function SmartDataEntry({
  onActionComplete,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
  onRallyExtras,
}: SmartDataEntryProps) {
  const [setupA, setSetupA] = useState<TeamSetup | null>(null)
  const [setupB, setSetupB] = useState<TeamSetup | null>(null)
  const [formationA, setFormationA] = useState<Formation | null>(null)
  const [formationB, setFormationB] = useState<Formation | null>(null)

  const [servingTeam, setServingTeam] = useState<"A" | "B">("A")
  const [possession, setPossession] = useState<"A" | "B">("A")
  const [touches, setTouches] = useState<Touch[]>([])
  const [pending, setPending] = useState<{ team: "A" | "B"; player: number; pos: CourtPos | null } | null>(null)
  const [negative, setNegative] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [directionPanel, setDirectionPanel] = useState<{
    origin: ReturnType<typeof attackTokenToOrigin>
    finalize: (dir: AttackDirection) => void
  } | null>(null)

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const nameOf = (team: "A" | "B", num: number) => {
    const players = team === "A" ? teamAPlayers : teamBPlayers
    return players.find((p) => p.number === num)?.name || `#${num}`
  }
  const roleOf = (team: "A" | "B", num: number) => {
    const setup = team === "A" ? setupA : setupB
    return setup?.roles[num]
  }

  const handleSetupComplete = (a: TeamSetup, b: TeamSetup) => {
    setSetupA(a)
    setSetupB(b)
    setFormationA(a.formation)
    setFormationB(b.formation)
  }

  if (!setupA || !setupB || !formationA || !formationB) {
    return (
      <FormationSetup
        teamAName={teamAName}
        teamBName={teamBName}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        onComplete={handleSetupComplete}
      />
    )
  }

  // Formação exibida (com líbero aplicado automaticamente).
  const courtA = applyLibero(formationA, setupA)
  const courtB = applyLibero(formationB, setupB)
  const setterA = findSetter(courtA, setupA)
  const setterB = findSetter(courtB, setupB)

  const pushTouch = (team: "A" | "B", player: number, pos: CourtPos | null, fundamento: Fundamento) => {
    const attackToken = fundamento === "A" ? attackTokenFor(roleOf(team, player), pos) : undefined
    const touch: Touch = { team, player, courtPos: pos, fundamento, attackToken, positive: !negative }
    setTouches((prev) => [...prev, touch])
    setLog((prev) => [
      {
        id: Math.random().toString(),
        team,
        label: `P${pos ?? "-"} · ${FUNDAMENTO_LABEL[fundamento]}`,
        detail: `${nameOf(team, player)}${negative ? " (negativo)" : ""}`,
        time: formatTime(elapsed),
      },
      ...prev,
    ])
    setNegative(false)
    setPending(null)
  }

  const handlePlayerTap = (team: "A" | "B", pos: CourtPos) => {
    const court = team === "A" ? courtA : courtB
    setPossession(team)
    setPending({ team, player: court[pos], pos })
  }

  const handleFundamento = (f: Fundamento) => {
    // Levantamento sem atleta selecionado: usa o levantador em quadra da posse.
    if (f === "L" && !pending) {
      const setter = possession === "A" ? setterA : setterB
      const court = possession === "A" ? courtA : courtB
      if (setter) {
        pushTouch(possession, setter, findPosition(court, setter), "L")
        return
      }
    }
    if (!pending) return
    pushTouch(pending.team, pending.player, pending.pos, f)
  }

  const resetRally = () => {
    setTouches([])
    setPending(null)
    setNegative(false)
  }

  const commit = (end: "point" | "error", direction?: AttackDirection) => {
    if (touches.length === 0) return
    const result = finalizeRally(touches, end, direction)
    result.actions.forEach((a) => onActionComplete(a))
    onRallyExtras?.(result.extras)

    // Rodízio automático: quem conquista o saque (side-out) gira.
    const winner = result.pointScoredBy
    if (winner !== servingTeam) {
      if (winner === "A") setFormationA((f) => (f ? rotateFormation(f) : f))
      else setFormationB((f) => (f ? rotateFormation(f) : f))
    }
    setServingTeam(winner)
    setPossession(winner)
    resetRally()
  }

  const handleEnd = (end: "point" | "error") => {
    if (touches.length === 0) return
    const last = touches[touches.length - 1]
    // Ataque terminado em ponto sem defesa adversária: abrir painel de direção.
    if (end === "point" && last.fundamento === "A" && last.attackToken) {
      const origin = attackTokenToOrigin(last.attackToken)
      setDirectionPanel({
        origin,
        finalize: (dir) => {
          setDirectionPanel(null)
          commit("point", dir)
        },
      })
      return
    }
    // Se o rally teve defesa da equipe adversária ao último ataque, infere direção.
    let inferred: AttackDirection | undefined
    if (last.fundamento === "A" && last.attackToken) {
      const origin = attackTokenToOrigin(last.attackToken)
      const defense = [...touches].reverse().find((t) => t.fundamento === "D" && t.team !== last.team)
      inferred = inferAttackDirection(origin, defense?.courtPos ?? null)
    }
    commit(end, inferred)
  }

  const undoLast = () => {
    setTouches((prev) => prev.slice(0, -1))
    setLog((prev) => prev.slice(1))
  }

  const lastLog = log[0]

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-slate-100 to-slate-50 p-3">
      {/* Cabeçalho / Placar */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight">
              VOLLEY <span className="text-orange-500">TECH</span>
            </p>
            <p className="text-[10px] text-slate-400">Scout View IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-white">
          <span className="text-sm font-semibold">{teamAName}</span>
          <span className="rounded bg-blue-600 px-2 py-0.5 text-lg font-bold">{teamAScore}</span>
          <span className="text-xs text-slate-300">x</span>
          <span className="rounded bg-orange-500 px-2 py-0.5 text-lg font-bold">{teamBScore}</span>
          <span className="text-sm font-semibold">{teamBName}</span>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="font-mono text-sm font-bold text-slate-800">{formatTime(elapsed)}</p>
          <p>Saque: {servingTeam === "A" ? teamAName : teamBName}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
        {/* Coluna esquerda: última ação + histórico */}
        <div className="space-y-3">
          <Card className="p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Última ação</p>
            {lastLog ? (
              <div>
                <p className="text-2xl font-extrabold text-slate-900">
                  <span className={lastLog.team === "A" ? "text-blue-600" : "text-orange-500"}>
                    {lastLog.team}
                  </span>{" "}
                  {lastLog.label}
                </p>
                <p className="text-sm text-slate-500">{lastLog.detail}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">{lastLog.time}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nenhuma ação registrada ainda.</p>
            )}
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Histórico do rally</p>
            {touches.length === 0 ? (
              <p className="text-sm text-slate-400">
                Selecione um atleta e um fundamento. Alterne a equipe quando a posse mudar.
              </p>
            ) : (
              <ol className="space-y-1">
                {touches.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                        t.team === "A" ? "bg-blue-600" : "bg-orange-500"
                      }`}
                    >
                      {t.team}
                    </span>
                    <span className="font-semibold text-slate-800">
                      P{t.courtPos ?? "-"} · {FUNDAMENTO_LABEL[t.fundamento]}
                    </span>
                    <span className="text-slate-400">{nameOf(t.team, t.player)}</span>
                    {!t.positive && <span className="text-xs font-medium text-red-500">neg</span>}
                  </li>
                ))}
              </ol>
            )}
            {touches.length > 0 && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={undoLast}>
                  <Undo2 className="mr-1 h-4 w-4" />
                  Desfazer toque
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={resetRally}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Limpar rally
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Coluna direita: quadras */}
        <div className="space-y-3">
          {renderCourt("A", teamAName, courtA, setupA, describeSystem(setupA), setterA, servingTeam === "A", possession === "A", handlePlayerTap, pending, nameOf, roleOf)}
          {renderCourt("B", teamBName, courtB, setupB, describeSystem(setupB), setterB, servingTeam === "B", possession === "B", handlePlayerTap, pending, nameOf, roleOf)}
        </div>
      </div>

      {/* Controles de registro */}
      <Card className="mt-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Posse da bola
          </p>
          {pending && (
            <p className="text-sm text-slate-600">
              Selecionado:{" "}
              <span className="font-bold text-slate-900">
                #{pending.player} {nameOf(pending.team, pending.player)}
              </span>{" "}
              (P{pending.pos})
            </p>
          )}
        </div>

        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPossession("A")}
            className={`flex-1 rounded-xl px-4 py-3 text-lg font-extrabold transition ${
              possession === "A" ? "bg-blue-600 text-white shadow" : "bg-slate-100 text-slate-500"
            }`}
          >
            {teamAName}
          </button>
          <span className="text-slate-400">↔</span>
          <button
            onClick={() => setPossession("B")}
            className={`flex-1 rounded-xl px-4 py-3 text-lg font-extrabold transition ${
              possession === "B" ? "bg-orange-500 text-white shadow" : "bg-slate-100 text-slate-500"
            }`}
          >
            {teamBName}
          </button>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fundamento</p>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {FUNDAMENTOS.map((f) => (
            <button
              key={f}
              onClick={() => handleFundamento(f)}
              disabled={f !== "L" && !pending}
              className="rounded-lg border border-slate-200 bg-white py-3 text-center font-bold text-slate-800 transition hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="block text-lg">{f}</span>
              <span className="block text-[10px] font-medium text-slate-400">{FUNDAMENTO_LABEL[f]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNegative((n) => !n)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              negative ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Próximo toque: {negative ? "NEGATIVO" : "POSITIVO"}
          </button>
          <div className="flex-1" />
          <Button
            onClick={() => handleEnd("error")}
            disabled={touches.length === 0}
            className="bg-red-600 px-6 font-bold text-white hover:bg-red-700"
          >
            Erro (E)
          </Button>
          <Button
            onClick={() => handleEnd("point")}
            disabled={touches.length === 0}
            className="bg-green-600 px-6 font-bold text-white hover:bg-green-700"
          >
            Ponto (#)
          </Button>
        </div>
      </Card>

      {/* Painel de direção (ataque terminado em ponto) */}
      {directionPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="mb-1 text-lg font-bold text-slate-900">Direção do ataque</h3>
            <p className="mb-4 text-sm text-slate-500">
              O ataque terminou em ponto. Selecione a direção da bola.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {possibleDirections(directionPanel.origin).map((d) => (
                <button
                  key={d.value}
                  onClick={() => directionPanel.finalize(d.value)}
                  className="rounded-lg border border-slate-200 bg-white py-4 font-semibold text-slate-800 transition hover:border-orange-400 hover:bg-orange-50"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => directionPanel.finalize("indefinida")}
              className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              Não identificar direção
            </button>
          </Card>
        </div>
      )}
    </div>
  )
}

function renderCourt(
  team: "A" | "B",
  name: string,
  court: Formation,
  setup: TeamSetup,
  system: string,
  setter: number | null,
  isServing: boolean,
  isActive: boolean,
  onTap: (team: "A" | "B", pos: CourtPos) => void,
  pending: { team: "A" | "B"; player: number; pos: CourtPos | null } | null,
  nameOf: (team: "A" | "B", num: number) => string,
  roleOf: (team: "A" | "B", num: number) => string | undefined,
) {
  const isA = team === "A"
  const bg = isA ? "bg-blue-50" : "bg-orange-50"
  const badge = isA ? "bg-blue-600" : "bg-orange-500"
  const border = isActive ? (isA ? "border-blue-500" : "border-orange-500") : "border-transparent"
  // Ordem visual: rede em cima (4,3,2), fundo embaixo (5,6,1).
  const order: CourtPos[] = [4, 3, 2, 5, 6, 1]

  return (
    <Card className={`overflow-hidden border-2 ${border}`}>
      <div className={`flex items-center justify-between px-4 py-2 ${badge} text-white`}>
        <span className="font-bold">{name}</span>
        <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold">{system}</span>
      </div>
      <div className={`grid grid-cols-3 gap-2 p-3 ${bg}`}>
        {order.map((pos) => {
          const num = court[pos]
          const role = roleOf(team, num)
          const isLibero = setup.liberoNumber === num
          const isSetter = setter === num
          const selected = pending?.team === team && pending?.pos === pos
          return (
            <button
              key={pos}
              onClick={() => onTap(team, pos)}
              className={`relative flex flex-col items-center rounded-xl border bg-white py-3 transition ${
                selected ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-400"
              }`}
            >
              {isLibero && (
                <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  L
                </span>
              )}
              {isServing && pos === 1 && (
                <span className="absolute right-1 top-1 text-[8px] font-bold text-slate-400">SAQUE</span>
              )}
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold text-white ${badge}`}>
                {num}
              </span>
              <span className="mt-1 text-xs font-bold text-slate-700">P{pos}</span>
              <span className="text-[9px] leading-tight text-slate-400">
                {isSetter ? "LEV" : role ? roleShort(role) : ""}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function roleShort(role: string): string {
  switch (role) {
    case "levantador":
      return "LEV"
    case "oposto":
      return "OP"
    case "ponteiro":
      return "PO"
    case "central":
      return "CE"
    case "libero":
      return "LI"
    default:
      return ""
  }
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
