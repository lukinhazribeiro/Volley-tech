"use client"

import { useEffect, useState } from "react"
import {
  Trash2,
  Undo2,
  Pause,
  Play,
  Settings,
  User,
  ArrowLeftRight,
  Swords,
  Hand,
  Send,
  ShieldCheck,
  HandMetal,
  ArrowUpFromLine,
  Timer,
} from "lucide-react"
import type { MatchAction, TeamStats } from "@/lib/scout/match-parser"
import type { Player } from "@/components/scout/team-roster-management"
import {
  type CourtPos,
  type Formation,
  type TeamSetup,
  type Fundamento,
  type Touch,
  type AttackToken,
  type PlayerRole,
  ROLE_LABEL,
  ROLE_OPTIONS,
  DEFAULT_DEFENSIVE_BY_ROLE,
  applyLibero,
  rotateFormation,
  findSetter,
  findPosition,
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
  statsA?: TeamStats
  statsB?: TeamStats
  setNumber?: number
  onRallyExtras?: (extras: unknown) => void
}

/** Config visual dos botões de AÇÃO (fundamentos). */
const ACOES: { f: Fundamento; label: string; Icon: typeof Swords; color: string }[] = [
  { f: "A", label: "ATAQUE", Icon: Swords, color: "text-orange-500 border-orange-200 bg-orange-50" },
  { f: "B", label: "BLOQUEIO", Icon: HandMetal, color: "text-violet-600 border-violet-200 bg-violet-50" },
  { f: "P", label: "PASSE", Icon: Hand, color: "text-blue-600 border-blue-200 bg-blue-50" },
  { f: "S", label: "SAQUE", Icon: Send, color: "text-amber-500 border-amber-200 bg-amber-50" },
  { f: "D", label: "DEFESA", Icon: ShieldCheck, color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  { f: "L", label: "LEVANT.", Icon: ArrowUpFromLine, color: "text-cyan-600 border-cyan-200 bg-cyan-50" },
]

interface LogEntry {
  id: string
  team: "A" | "B"
  pos: CourtPos | null
  f: Fundamento
  symbol: string
  detail: string
  time: string
}

/** Deriva o token de ataque a partir da função + posição do atleta. */
function attackTokenFor(role: PlayerRole | undefined, pos: CourtPos | null): AttackToken {
  if (pos && BACK_ROW.includes(pos)) return "F"
  if (role === "central") return "M"
  if (role === "oposto") return "O"
  if (role === "levantador") return "S"
  return "P"
}

function roleShort(role?: PlayerRole): string {
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

export default function SmartDataEntry({
  onActionComplete,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
  statsA,
  statsB,
  setNumber = 1,
  onRallyExtras,
}: SmartDataEntryProps) {
  // A quadra aparece imediatamente: montamos uma formação padrão a partir dos
  // atletas (ou geramos números 1..6). Formação, funções e líbero podem ser
  // ajustados na própria página, na quadra (botão "Formação / Atletas").
  const [setupA, setSetupA] = useState<TeamSetup>(() => buildDefaultSetup(teamAPlayers))
  const [setupB, setSetupB] = useState<TeamSetup>(() => buildDefaultSetup(teamBPlayers))
  const [formationA, setFormationA] = useState<Formation>(() => buildDefaultSetup(teamAPlayers).formation)
  const [formationB, setFormationB] = useState<Formation>(() => buildDefaultSetup(teamBPlayers).formation)
  const [editMode, setEditMode] = useState(false)

  const [servingTeam, setServingTeam] = useState<"A" | "B">("A")
  const [possession, setPossession] = useState<"A" | "B">("A")
  const [touches, setTouches] = useState<Touch[]>([])
  const [pending, setPending] = useState<{ team: "A" | "B"; player: number; pos: CourtPos | null } | null>(null)
  const [negative, setNegative] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])

  const [setterChooser, setSetterChooser] = useState<{ options: { role: PlayerRole; player: number; pos: CourtPos }[] } | null>(
    null,
  )

  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  const nameOf = (team: "A" | "B", num: number) => {
    const players = team === "A" ? teamAPlayers : teamBPlayers
    return players.find((p) => p.number === num)?.name || `#${num}`
  }
  const roleOf = (team: "A" | "B", num: number): PlayerRole | undefined => {
    const setup = team === "A" ? setupA : setupB
    return setup?.roles[num]
  }

  // Atualiza o número de um atleta numa posição da formação (editor inline).
  const setFormationSlot = (team: "A" | "B", pos: CourtPos, num: number) => {
    if (team === "A") setFormationA((f) => ({ ...f, [pos]: num }))
    else setFormationB((f) => ({ ...f, [pos]: num }))
  }
  // Define/atualiza a função de um atleta (por número).
  const setRole = (team: "A" | "B", num: number, role: PlayerRole) => {
    const setSetup = team === "A" ? setSetupA : setSetupB
    setSetup((s) => ({ ...s, roles: { ...s.roles, [num]: role } }))
  }
  const setLibero = (team: "A" | "B", num: number | undefined) => {
    const setSetup = team === "A" ? setSetupA : setSetupB
    setSetup((s) => ({ ...s, liberoNumber: num }))
  }

  // Formação exibida (com líbero aplicado automaticamente).
  const courtA = applyLibero(formationA, setupA)
  const courtB = applyLibero(formationB, setupB)
  const setterA = findSetter(courtA, setupA)
  const setterB = findSetter(courtB, setupB)
  const possessionCourt = possession === "A" ? courtA : courtB
  const possessionSetup = possession === "A" ? setupA : setupB

  const pushTouch = (team: "A" | "B", player: number, pos: CourtPos | null, fundamento: Fundamento, isNeg?: boolean) => {
    const neg = isNeg ?? negative
    const attackToken = fundamento === "A" ? attackTokenFor(roleOf(team, player), pos) : undefined
    const touch: Touch = { team, player, courtPos: pos, fundamento, attackToken, positive: !neg }
    setTouches((prev) => [...prev, touch])
    setLog((prev) => [
      {
        id: Math.random().toString(36).slice(2),
        team,
        pos,
        f: fundamento,
        symbol: neg ? "•" : "+",
        detail: `${FUNDAMENTO_DETAIL[fundamento]} — ${nameOf(team, player)}`,
        time: formatTime(elapsed),
      },
      ...prev,
    ])
    setNegative(false)
    setPending(null)
  }

  const selectPlayer = (team: "A" | "B", pos: CourtPos) => {
    const court = team === "A" ? courtA : courtB
    setPossession(team)
    setPending({ team, player: court[pos], pos })
  }

  const handleFundamento = (f: Fundamento) => {
    // Saque: sempre da P1 da equipe que saca.
    if (f === "S") {
      const court = servingTeam === "A" ? courtA : courtB
      setPossession(servingTeam)
      pushTouch(servingTeam, court[1], 1, "S")
      return
    }

    // Levantamento automático: usa o levantador em quadra da posse.
    // Só pergunta "quem levantou?" se o próprio levantador tiver defendido no rally.
    if (f === "L") {
      const setter = possession === "A" ? setterA : setterB
      const court = possessionCourt
      const setterDefended =
        setter != null && touches.some((t) => t.team === possession && t.player === setter && t.fundamento === "D")
      if (setter != null && !setterDefended) {
        pushTouch(possession, setter, findPosition(court, setter), "L")
        return
      }
      // Levantador defendeu (ou não há levantador em quadra): perguntar.
      const wanted: PlayerRole[] = ["libero", "ponteiro", "central", "oposto"]
      const options = wanted
        .map((role) => {
          for (const pos of [1, 2, 3, 4, 5, 6] as CourtPos[]) {
            if (possessionSetup.roles[court[pos]] === role) return { role, player: court[pos], pos }
          }
          return null
        })
        .filter(Boolean) as { role: PlayerRole; player: number; pos: CourtPos }[]
      setSetterChooser({ options })
      return
    }

    if (!pending) return
    pushTouch(pending.team, pending.player, pending.pos, f)
  }

  const resetRally = () => {
    setTouches([])
    setPending(null)
    setNegative(false)
  }

  const finalizeDisplay = (end: "point" | "error", f: Fundamento) => {
    setLog((prev) => {
      if (prev.length === 0) return prev
      const [head, ...rest] = prev
      const symbol = end === "point" ? "#" : "!"
      return [{ ...head, symbol, detail: describeResult(f, end) }, ...rest]
    })
  }

  const handleEnd = (end: "point" | "error") => {
    if (touches.length === 0) return
    const lastF = touches[touches.length - 1].fundamento
    const result = finalizeRally(touches, end)
    result.actions.forEach((a) => onActionComplete(a))
    onRallyExtras?.(result.extras)
    finalizeDisplay(end, lastF)

    // Rodízio automático: quem conquista o saque (side-out) gira.
    const winner = result.pointScoredBy
    if (winner !== servingTeam) {
      if (winner === "A") setFormationA((f) => rotateFormation(f))
      else setFormationB((f) => rotateFormation(f))
    }
    setServingTeam(winner)
    setPossession(winner)
    resetRally()
  }

  const undoLast = () => {
    setTouches((prev) => prev.slice(0, -1))
    setLog((prev) => prev.slice(1))
  }

  const lastLog = log[0]


  return (
    <div className="min-h-full w-full bg-slate-100 p-2 sm:p-4">
      <div className="mx-auto max-w-[1120px] space-y-3">
        {/* ============ CABEÇALHO + PLACAR ============ */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black">
              V
            </div>
            <div className="leading-tight">
              <p className="text-base font-black tracking-tight text-slate-900">
                VOLLEY <span className="text-orange-500">TECH</span>
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                Inteligência para decisões vencedoras
              </p>
            </div>
          </div>

          <div className="flex items-center overflow-hidden rounded-xl shadow-sm">
            <div className="bg-blue-700 px-3 py-2 text-right text-white sm:px-4">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{teamAName}</p>
            </div>
            <div className="bg-blue-700 px-3 py-1.5 text-3xl font-black text-white">{teamAScore}</div>
            <div className="bg-white px-3 py-1 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Set {setNumber}</p>
              <p className="text-xs font-bold text-slate-700">
                {teamAScore} - {teamBScore}
              </p>
            </div>
            <div className="bg-orange-500 px-3 py-1.5 text-3xl font-black text-white">{teamBScore}</div>
            <div className="bg-orange-500 px-3 py-2 text-left text-white sm:px-4">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">{teamBName}</p>
            </div>
          </div>

          <button
            onClick={() => setEditMode(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Editar formação e atletas"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* ============ CORPO PRINCIPAL (2 colunas) ============ */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          {/* ---- Coluna 1: QUADRA DE VÔLEI ---- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
                <Timer className="h-4 w-4 text-slate-400" />
                <p className="font-mono text-sm font-bold text-slate-800">{formatTime(elapsed)}</p>
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                <Settings className="h-4 w-4" /> Formação / Atletas
              </button>
            </div>

            <VolleyCourt
              teamAName={teamAName}
              teamBName={teamBName}
              courtA={courtA}
              courtB={courtB}
              setupA={setupA}
              setupB={setupB}
              systemA={describeSystem(setupA)}
              systemB={describeSystem(setupB)}
              setterA={setterA}
              setterB={setterB}
              servingTeam={servingTeam}
              possession={possession}
              onTap={selectPlayer}
              pending={pending}
              roleOf={roleOf}
            />
          </div>

          {/* ---- Coluna 2: última ação + histórico ---- */}
          <div className="space-y-3">
            {/* Última ação */}
            <div className="rounded-2xl border-l-4 border-blue-600 bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Última ação</p>
              {lastLog ? (
                <div>
                  <p className="text-2xl font-black">
                    <span className={lastLog.team === "A" ? "text-blue-600" : "text-orange-500"}>P{lastLog.pos ?? "-"}</span>
                    <span className="text-slate-300"> - </span>
                    <span className="text-orange-500">{lastLog.f}</span>
                    <span className="text-slate-300"> - </span>
                    <span className="text-slate-800">{lastLog.symbol}</span>
                  </p>
                  <p className="text-sm text-slate-600">{lastLog.detail}</p>
                  {lastLog.pos != null && <p className="text-xs text-slate-400">Afeta na posição {lastLog.pos}</p>}
                  <p className="mt-1 font-mono text-xs text-slate-400">{lastLog.time}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nenhuma ação registrada ainda.</p>
              )}
            </div>

            {/* Histórico de ações */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Histórico de ações</p>
              {log.length === 0 ? (
                <p className="text-sm text-slate-400">Registre a sequência das ações do rally.</p>
              ) : (
                <ol className="space-y-3">
                  {log.slice(0, 6).map((e) => (
                    <li key={e.id} className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                          e.team === "A" ? "bg-blue-600" : "bg-orange-500"
                        }`}
                      >
                        {e.team}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <p className="font-mono text-xs text-slate-400">{e.time}</p>
                        <p className="font-bold text-slate-800">
                          P{e.pos ?? "-"} <span className="text-orange-500">- {e.f} -</span>{" "}
                          <span className={e.symbol === "!" ? "text-red-500" : "text-slate-800"}>{e.symbol}</span>
                        </p>
                        <p className="truncate text-xs text-slate-500">{e.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {touches.length > 0 && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={undoLast}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Desfazer
                  </button>
                  <button
                    onClick={resetRally}
                    className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpar rally
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ TROCA DE EQUIPE + LIMPAR ============ */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPossession("A")}
              className={`flex-1 rounded-xl px-4 py-4 text-center transition ${
                possession === "A"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <p className="text-3xl font-black leading-none">A</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{teamAName}</p>
            </button>
            <ArrowLeftRight className="h-6 w-6 shrink-0 text-slate-400" />
            <button
              onClick={() => setPossession("B")}
              className={`flex-1 rounded-xl px-4 py-4 text-center transition ${
                possession === "B"
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <p className="text-3xl font-black leading-none">B</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{teamBName}</p>
            </button>
          </div>
          <div className="mt-3 flex justify-center">
            <button
              onClick={undoLast}
              disabled={touches.length === 0}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> LIMPAR ÚLTIMA AÇÃO
            </button>
          </div>
        </div>

        {/* ============ IDENTIFICAÇÃO + AÇÃO / QUALIFICAÇÃO ============ */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Identificação de atletas (equipe com a posse) */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-slate-800">IDENTIFICAÇÃO DE ATLETAS</h3>
            <p className="mb-3 text-xs text-slate-400">Selecione o atleta que executou a ação</p>
            <div className="grid grid-cols-3 gap-3">
              {([4, 3, 2, 5, 6, 1] as CourtPos[]).map((pos) => {
                const num = possessionCourt[pos]
                const selected = pending?.team === possession && pending?.pos === pos
                const isLibero = possessionSetup.liberoNumber === num
                return (
                  <button
                    key={pos}
                    onClick={() => selectPlayer(possession, pos)}
                    className={`flex flex-col items-center rounded-xl border-2 p-2 transition ${
                      selected ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm font-black text-slate-700">P{pos}</span>
                    <span
                      className={`relative mt-1 flex h-12 w-12 items-center justify-center rounded-full text-white ${
                        possession === "A" ? "bg-blue-600" : "bg-orange-500"
                      }`}
                    >
                      <User className="h-6 w-6" />
                      {isLibero && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black">
                          L
                        </span>
                      )}
                    </span>
                    <span className="mt-1 text-xs font-bold text-slate-800">#{num}</span>
                  </button>
                )
              })}
            </div>
            {pending && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
                Selecionado:{" "}
                <span className="font-bold text-slate-900">
                  #{pending.player} {nameOf(pending.team, pending.player)}
                </span>{" "}
                (P{pending.pos})
              </p>
            )}
          </div>

          {/* Ação + Qualificação */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-base font-black tracking-tight text-slate-800">AÇÃO</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ACOES.map(({ f, label, Icon, color }) => (
                  <button
                    key={f}
                    onClick={() => handleFundamento(f)}
                    disabled={f !== "S" && f !== "L" && !pending}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-lg leading-none">{f}</span>
                    <span className="text-[9px] font-semibold text-slate-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-base font-black tracking-tight text-slate-800">QUALIFICAÇÃO DA AÇÃO</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNegative(true)}
                  className={`rounded-xl py-3 text-sm font-black uppercase tracking-wide transition ${
                    negative ? "bg-red-600 text-white shadow" : "bg-red-50 text-red-500"
                  }`}
                >
                  Negativo
                </button>
                <button
                  onClick={() => setNegative(false)}
                  className={`rounded-xl py-3 text-sm font-black uppercase tracking-wide transition ${
                    !negative ? "bg-emerald-600 text-white shadow" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  Positivo
                </button>
              </div>
              <p className="mt-2 text-center text-xs font-semibold uppercase text-slate-400">
                Próximo toque: {negative ? "Negativo" : "Positivo"}
              </p>

              {/* Finalização do rally */}
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleEnd("error")}
                  disabled={touches.length === 0}
                  className="rounded-xl bg-red-600 py-3 text-sm font-black uppercase text-white shadow transition hover:bg-red-700 disabled:opacity-40"
                >
                  Erro (E)
                </button>
                <button
                  onClick={() => handleEnd("point")}
                  disabled={touches.length === 0}
                  className="rounded-xl bg-green-600 py-3 text-sm font-black uppercase text-white shadow transition hover:bg-green-700 disabled:opacity-40"
                >
                  Ponto (#)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-2 pb-2 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wide">
            Inteligência para <span className="text-orange-400">decisões vencedoras</span>
          </span>
          <span className="font-black text-blue-700">SCOUT VIEW IA</span>
        </div>
      </div>

      {/* ===== Editor inline: formação / atletas / funções ===== */}
      {editMode && (
        <FormationEditor
          teamAName={teamAName}
          teamBName={teamBName}
          formationA={formationA}
          formationB={formationB}
          setupA={setupA}
          setupB={setupB}
          nameOf={nameOf}
          onSlot={setFormationSlot}
          onRole={setRole}
          onLibero={setLibero}
          onClose={() => setEditMode(false)}
        />
      )}

      {/* ===== Painel: quem levantou? (levantador defendeu) ===== */}
      {setterChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-slate-900">Quem levantou?</h3>
            <p className="mb-4 text-sm text-slate-500">O levantador defendeu a bola. Selecione quem fez o levantamento.</p>
            <div className="grid grid-cols-2 gap-2">
              {setterChooser.options.map((o) => (
                <button
                  key={o.role}
                  onClick={() => {
                    setSetterChooser(null)
                    pushTouch(possession, o.player, o.pos, "L")
                  }}
                  className="rounded-lg border border-slate-200 bg-white py-4 font-semibold text-slate-800 transition hover:border-cyan-400 hover:bg-cyan-50"
                >
                  {ROLE_LABEL[o.role]}
                  <span className="block text-xs text-slate-400">#{o.player}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSetterChooser(null)}
              className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ======================= Subcomponentes ======================= */

const FUNDAMENTO_DETAIL: Record<Fundamento, string> = {
  S: "Saque",
  P: "Passe / recepção",
  L: "Levantamento",
  A: "Ataque",
  B: "Bloqueio",
  D: "Defesa",
}

function describeResult(f: Fundamento, end: "point" | "error"): string {
  if (end === "point") {
    if (f === "S") return "Saque ponto (ACE)"
    if (f === "A") return "Ataque ponto"
    if (f === "B") return "Bloqueio ponto"
    return "Ponto"
  }
  if (f === "S") return "Erro de saque"
  if (f === "A") return "Erro de ataque"
  if (f === "B") return "Erro de bloqueio"
  if (f === "P") return "Erro de recepção"
  return "Erro"
}

interface VolleyCourtProps {
  teamAName: string
  teamBName: string
  courtA: Formation
  courtB: Formation
  setupA: TeamSetup
  setupB: TeamSetup
  systemA: string
  systemB: string
  setterA: number | null
  setterB: number | null
  servingTeam: "A" | "B"
  possession: "A" | "B"
  onTap: (team: "A" | "B", pos: CourtPos) => void
  pending: { team: "A" | "B"; player: number; pos: CourtPos | null } | null
  roleOf: (team: "A" | "B", num: number) => PlayerRole | undefined
}

/** Quadra de vôlei realista: as duas equipes dividem a mesma quadra, separadas
 *  pela rede central, com linhas de ataque (3m) e limites em branco. */
function VolleyCourt({
  teamAName,
  teamBName,
  courtA,
  courtB,
  setupA,
  setupB,
  systemA,
  systemB,
  setterA,
  setterB,
  servingTeam,
  possession,
  onTap,
  pending,
  roleOf,
}: VolleyCourtProps) {
  // Célula de posição (botão inteligente: número em destaque + P + função).
  const Cell = ({ team, pos }: { team: "A" | "B"; pos: CourtPos }) => {
    const isA = team === "A"
    const court = isA ? courtA : courtB
    const setup = isA ? setupA : setupB
    const setter = isA ? setterA : setterB
    const num = court[pos]
    const role = roleOf(team, num)
    const isLibero = setup.liberoNumber === num
    const isSetter = setter === num
    const serving = servingTeam === team
    const selected = pending?.team === team && pending?.pos === pos
    return (
      <button
        onClick={() => onTap(team, pos)}
        className={`relative flex flex-col items-center justify-center rounded-lg py-2 transition ${
          isA ? "bg-blue-600/95 hover:bg-blue-600" : "bg-orange-500/95 hover:bg-orange-500"
        } ${selected ? "ring-2 ring-white" : ""}`}
      >
        {isLibero && (
          <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-black text-white">
            L
          </span>
        )}
        {serving && pos === 1 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[9px] font-black text-slate-900">
            S
          </span>
        )}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-slate-800">
          {num}
        </span>
        <span className="mt-0.5 text-[11px] font-black text-white">P{pos}</span>
        <span className="text-[8px] font-semibold uppercase text-white/80">{isSetter ? "LEV" : roleShort(role)}</span>
      </button>
    )
  }

  const activeRing = (team: "A" | "B") =>
    possession === team ? (team === "A" ? "ring-4 ring-blue-400" : "ring-4 ring-orange-400") : "ring-0"

  return (
    <div className="overflow-hidden rounded-2xl border-4 border-slate-200 bg-emerald-700 shadow-md">
      {/* Cabeçalho equipe A */}
      <div className={`flex items-center justify-between bg-blue-600 px-4 py-1.5 text-white ${activeRing("A")}`}>
        <span className="text-sm font-black">{teamAName}</span>
        <span className="rounded bg-white/25 px-2 py-0.5 text-[10px] font-bold">{systemA}</span>
      </div>

      {/* Metade da quadra — Equipe A (fundo em cima, rede embaixo) */}
      <div className="relative bg-emerald-600 px-3 pt-3">
        {/* fundo: P1 P6 P5 */}
        <div className="grid grid-cols-3 gap-2">
          {([1, 6, 5] as CourtPos[]).map((pos) => (
            <Cell key={pos} team="A" pos={pos} />
          ))}
        </div>
        {/* linha de ataque (3m) */}
        <div className="my-2 border-t-2 border-dashed border-white/60" />
        {/* rede: P2 P3 P4 */}
        <div className="grid grid-cols-3 gap-2 pb-3">
          {([2, 3, 4] as CourtPos[]).map((pos) => (
            <Cell key={pos} team="A" pos={pos} />
          ))}
        </div>
      </div>

      {/* Rede central */}
      <div className="relative flex h-6 items-center justify-center bg-slate-900">
        <div className="h-full w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_5px,rgba(255,255,255,0.35)_5px,rgba(255,255,255,0.35)_7px)]" />
        <span className="absolute rounded bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-700">
          Rede
        </span>
      </div>

      {/* Metade da quadra — Equipe B (rede em cima, fundo embaixo) */}
      <div className="relative bg-emerald-600 px-3 pt-3">
        {/* rede: P4 P3 P2 */}
        <div className="grid grid-cols-3 gap-2">
          {([4, 3, 2] as CourtPos[]).map((pos) => (
            <Cell key={pos} team="B" pos={pos} />
          ))}
        </div>
        {/* linha de ataque (3m) */}
        <div className="my-2 border-t-2 border-dashed border-white/60" />
        {/* fundo: P5 P6 P1 */}
        <div className="grid grid-cols-3 gap-2 pb-3">
          {([5, 6, 1] as CourtPos[]).map((pos) => (
            <Cell key={pos} team="B" pos={pos} />
          ))}
        </div>
      </div>

      {/* Cabeçalho equipe B */}
      <div className={`flex items-center justify-between bg-orange-500 px-4 py-1.5 text-white ${activeRing("B")}`}>
        <span className="text-sm font-black">{teamBName}</span>
        <span className="rounded bg-white/25 px-2 py-0.5 text-[10px] font-bold">{systemB}</span>
      </div>
    </div>
  )
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const DEFAULT_ROLE_BY_POS: Record<CourtPos, PlayerRole> = {
  1: "levantador",
  2: "oposto",
  3: "central",
  4: "ponteiro",
  5: "ponteiro",
  6: "central",
}

/**
 * Monta uma formação/setup padrão a partir dos atletas cadastrados (ou gera
 * números 1..6 quando não há cadastro), para que a quadra apareça de imediato.
 * Tudo pode ser ajustado depois no editor inline (Formação / Atletas).
 */
function buildDefaultSetup(players: Player[]): TeamSetup {
  const roles: Record<number, PlayerRole> = {}
  for (const p of players) if (p.role) roles[p.number] = p.role

  const liberoPlayer = players.find((p) => p.role === "libero")
  const courtNums = players.filter((p) => p.role !== "libero").map((p) => p.number)

  // Garante 6 atletas em quadra.
  let next = 1
  while (courtNums.length < 6) {
    while (courtNums.includes(next) || next === liberoPlayer?.number) next++
    courtNums.push(next)
    next++
  }

  const formation = {
    1: courtNums[0],
    2: courtNums[1],
    3: courtNums[2],
    4: courtNums[3],
    5: courtNums[4],
    6: courtNums[5],
  } as Formation

  ;([1, 2, 3, 4, 5, 6] as CourtPos[]).forEach((pos) => {
    const num = formation[pos]
    if (!roles[num]) roles[num] = DEFAULT_ROLE_BY_POS[pos]
  })
  if (liberoPlayer && !roles[liberoPlayer.number]) roles[liberoPlayer.number] = "libero"

  return {
    formation,
    roles,
    liberoNumber: liberoPlayer?.number,
    defensiveByRole: { ...DEFAULT_DEFENSIVE_BY_ROLE },
  }
}

interface FormationEditorProps {
  teamAName: string
  teamBName: string
  formationA: Formation
  formationB: Formation
  setupA: TeamSetup
  setupB: TeamSetup
  nameOf: (team: "A" | "B", num: number) => string
  onSlot: (team: "A" | "B", pos: CourtPos, num: number) => void
  onRole: (team: "A" | "B", num: number, role: PlayerRole) => void
  onLibero: (team: "A" | "B", num: number | undefined) => void
  onClose: () => void
}

/** Editor inline: define números, funções e líbero direto na quadra. */
function FormationEditor({
  teamAName,
  teamBName,
  formationA,
  formationB,
  setupA,
  setupB,
  nameOf,
  onSlot,
  onRole,
  onLibero,
  onClose,
}: FormationEditorProps) {
  const renderTeam = (team: "A" | "B", name: string, formation: Formation, setup: TeamSetup) => {
    const accent = team === "A" ? "text-blue-600" : "text-orange-500"
    return (
      <div className="flex-1">
        <h4 className={`mb-2 text-base font-black ${accent}`}>{name}</h4>
        <div className="grid grid-cols-3 gap-2">
          {([4, 3, 2, 5, 6, 1] as CourtPos[]).map((pos) => {
            const num = formation[pos]
            return (
              <div key={pos} className="rounded-lg border border-slate-200 p-2">
                <p className="mb-1 text-xs font-bold text-slate-700">P{pos}</p>
                <label className="block text-[10px] text-slate-400">Número</label>
                <input
                  type="number"
                  value={num}
                  onChange={(e) => onSlot(team, pos, Number(e.target.value))}
                  className="mb-1 h-8 w-full rounded border border-slate-200 px-2 text-sm"
                />
                <label className="block text-[10px] text-slate-400">Função</label>
                <select
                  value={setup.roles[num] ?? ""}
                  onChange={(e) => onRole(team, num, e.target.value as PlayerRole)}
                  className="h-8 w-full rounded border border-slate-200 px-1 text-xs"
                >
                  <option value="">—</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 truncate text-[10px] text-slate-400">{nameOf(team, num)}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Líbero</label>
          <input
            type="number"
            value={setup.liberoNumber ?? ""}
            placeholder="Sem líbero"
            onChange={(e) => onLibero(team, e.target.value ? Number(e.target.value) : undefined)}
            className="h-8 w-full rounded border border-slate-200 px-2 text-sm"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3">
          <h3 className="text-lg font-black text-slate-900">Formação / Atletas</h3>
          <p className="text-sm text-slate-500">
            Monte a formação na quadra: número, função e líbero. O rodízio, o líbero e o levantador passam a ser
            automáticos.
          </p>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          {renderTeam("A", teamAName, formationA, setupA)}
          {renderTeam("B", teamBName, formationB, setupB)}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-black uppercase text-white hover:bg-green-700"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  )
}
