"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  type Play,
  type Team,
  type TeamNames,
  positionLabels,
  attackTypeLabels,
  noSetReasonLabels,
  getScoringTeam,
} from "@/lib/attack/volley-stats"

const TEAM_COLORS: Record<
  Team,
  { stroke: string; fill: string; glow: string; soft: string; text: string; chip: string }
> = {
  A: {
    stroke: "#22d3ee",
    fill: "#06b6d4",
    glow: "#22d3ee",
    soft: "bg-cyan-50",
    text: "text-cyan-700",
    chip: "bg-cyan-500",
  },
  B: {
    stroke: "#fb923c",
    fill: "#f97316",
    glow: "#fb923c",
    soft: "bg-orange-50",
    text: "text-orange-700",
    chip: "bg-orange-500",
  },
}

const RESULT_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ponto: { label: "Ponto", dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  certo: { label: "Certo", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  erro: { label: "Erro", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  bloqueado: { label: "Bloqueado", dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
}

function playSummary(play: Play): string {
  if (play.status === "sem_sequencia") {
    return play.noSetReason ? noSetReasonLabels[play.noSetReason] : "Sem sequência"
  }
  const parts: string[] = []
  if (play.position) parts.push(positionLabels[play.position])
  if (play.attackType) parts.push(attackTypeLabels[play.attackType])
  return parts.join(" → ") || "Levantamento"
}

function resultKey(play: Play): string {
  if (play.status === "sem_sequencia") {
    if (play.noSetReason === "erro_levantamento") return "erro"
    if (play.noSetReason === "erro_saque_adversario") return "ponto"
    return "certo"
  }
  if (play.attackType === "bloqueado") return "bloqueado"
  return play.result ?? "certo"
}

export function LastPlaysPanel({
  plays,
  teamNames,
}: {
  plays: Play[]
  teamNames: TeamNames
}) {
  // Equipes visíveis no gráfico (interativo)
  const [visible, setVisible] = useState<Record<Team, boolean>>({ A: true, B: true })

  const toggleTeam = (team: Team) =>
    setVisible((v) => {
      const next = { ...v, [team]: !v[team] }
      // Garante ao menos uma equipe visível
      if (!next.A && !next.B) return v
      return next
    })

  // plays vem do mais recente para o mais antigo; usamos as últimas 14 em ordem cronológica
  const recent = useMemo(() => [...plays].slice(0, 14).reverse(), [plays])

  // Série de momentum: pontos acumulados por equipe ao longo das jogadas
  const chartData = useMemo(() => {
    let aPts = 0
    let bPts = 0
    return recent.map((play, index) => {
      const scorer = getScoringTeam(play)
      if (scorer === "A") aPts++
      else if (scorer === "B") bPts++
      return {
        index: index + 1,
        A: aPts,
        B: bPts,
        team: play.team,
        summary: playSummary(play),
        result: resultKey(play),
      }
    })
  }, [recent])

  const lastByTeam = (team: Team) => plays.filter((p) => p.team === team).slice(0, 5)

  const totalPoints = (team: Team) => plays.filter((p) => getScoringTeam(p) === team).length

  if (plays.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">As jogadas registradas aparecerão aqui em tempo real.</p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Momentum das Jogadas</h3>
          <p className="text-xs text-slate-500">Pontos acumulados nas últimas {recent.length} jogadas</p>
        </div>
        {/* Toggle interativo de equipes */}
        <div className="flex gap-2">
          {(["A", "B"] as Team[]).map((team) => {
            const active = visible[team]
            return (
              <button
                key={team}
                onClick={() => toggleTeam(team)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? `${TEAM_COLORS[team].soft} ${TEAM_COLORS[team].text} border-current`
                    : "border-slate-200 bg-white text-slate-400"
                }`}
                aria-pressed={active}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? TEAM_COLORS[team].stroke : "#cbd5e1" }}
                />
                {teamNames[team]} · {totalPoints(team)} pts
              </button>
            )
          })}
        </div>
      </div>

      {/* Gráfico interativo de momentum - painel HUD futurista */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-2 shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)]">
        {/* Brilho ambiente nos cantos */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />
        {/* Cantos tech */}
        <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-cyan-400/60" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-cyan-400/60" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-orange-400/60" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-orange-400/60" />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TEAM_COLORS.A.fill} stopOpacity={0.5} />
                <stop offset="95%" stopColor={TEAM_COLORS.A.fill} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TEAM_COLORS.B.fill} stopOpacity={0.5} />
                <stop offset="95%" stopColor={TEAM_COLORS.B.fill} stopOpacity={0.02} />
              </linearGradient>
              <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="#1e3a5f" strokeOpacity={0.7} />
            <XAxis
              dataKey="index"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#1e3a5f" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip content={<MomentumTooltip teamNames={teamNames} />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
            {visible.A && (
              <Area
                type="monotone"
                dataKey="A"
                stroke={TEAM_COLORS.A.stroke}
                strokeWidth={3}
                fill="url(#fillA)"
                style={{ filter: "url(#glowA)" }}
                dot={{ r: 2.5, fill: "#0f172a", stroke: TEAM_COLORS.A.stroke, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: TEAM_COLORS.A.stroke, stroke: "#0f172a", strokeWidth: 2 }}
                isAnimationActive
              />
            )}
            {visible.B && (
              <Area
                type="monotone"
                dataKey="B"
                stroke={TEAM_COLORS.B.stroke}
                strokeWidth={3}
                fill="url(#fillB)"
                style={{ filter: "url(#glowB)" }}
                dot={{ r: 2.5, fill: "#0f172a", stroke: TEAM_COLORS.B.stroke, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: TEAM_COLORS.B.stroke, stroke: "#0f172a", strokeWidth: 2 }}
                isAnimationActive
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Últimas jogadas por equipe */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["A", "B"] as Team[]).map((team) => {
          const teamPlays = lastByTeam(team)
          return (
            <div key={team} className="rounded-2xl border-2 border-slate-100 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold text-white ${TEAM_COLORS[team].chip}`}
                >
                  {team}
                </span>
                <span className="truncate text-sm font-semibold text-slate-700">{teamNames[team]}</span>
              </div>
              {teamPlays.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">Sem jogadas ainda</p>
              ) : (
                <ul className="space-y-1.5">
                  {teamPlays.map((play) => {
                    const rk = resultKey(play)
                    const style = RESULT_STYLES[rk]
                    return (
                      <li
                        key={play.id}
                        className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 ${style.bg}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                          <span className="truncate text-xs text-slate-600">{playSummary(play)}</span>
                        </span>
                        <span className={`shrink-0 text-[11px] font-semibold ${style.text}`}>{style.label}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MomentumTooltip({
  active,
  payload,
  teamNames,
}: {
  active?: boolean
  payload?: Array<{ payload: { index: number; A: number; B: number; team: Team; summary: string; result: string } }>
  teamNames: TeamNames
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const style = RESULT_STYLES[point.result]
  return (
    <div className="rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 shadow-[0_0_20px_-4px_rgba(34,211,238,0.5)] backdrop-blur">
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style?.dot ?? "bg-slate-400"}`} />
        <span className="text-xs font-bold text-slate-100">
          Jogada #{point.index} · {teamNames[point.team]}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-400">
        {point.summary} {style ? `(${style.label})` : ""}
      </p>
      <div className="flex gap-3 text-xs">
        <span className="font-semibold text-cyan-400">
          {teamNames.A}: {point.A}
        </span>
        <span className="font-semibold text-orange-400">
          {teamNames.B}: {point.B}
        </span>
      </div>
    </div>
  )
}
