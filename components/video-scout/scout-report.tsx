"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Download, Target, TrendingUp, Trophy, XCircle } from "lucide-react"
import {
  FUNDAMENTO_LABEL,
  TEAM_LABEL,
  TEAM_STYLE,
  type Fundamento,
  type Player,
  type ScoutAction,
  type TeamSide,
} from "@/lib/video-scout/types"
import { computeBreakdowns, computeSummary, type PlayerStat } from "@/lib/video-scout/stats"
import { ScoutCharts } from "./scout-charts"

interface ScoutReportProps {
  actions: ScoutAction[]
  players: Player[]
  onBackToValidation: () => void
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

// Cor do TGP (% de participação do atleta nos pontos da equipe).
function tgpColor(value: number) {
  if (value >= 20) return "text-emerald-600"
  if (value >= 10) return "text-amber-600"
  return "text-slate-600"
}

/** Soma os valores de um fundamento para um jogador. */
function fund(stat: PlayerStat, f: Fundamento) {
  return stat.porFundamento[f]
}

// Colunas numéricas da planilha (rótulo curto + como extrair o valor).
type Col = { key: string; label: string; get: (s: PlayerStat) => number }

const COLS: { group: string; cols: Col[] }[] = [
  {
    group: "Saque",
    cols: [
      { key: "saq_t", label: "T", get: (s) => fund(s, "saque").total },
      { key: "saq_p", label: "Ace", get: (s) => fund(s, "saque").pontos },
      { key: "saq_e", label: "Err", get: (s) => fund(s, "saque").erros },
    ],
  },
  {
    group: "Recepção",
    cols: [
      { key: "rec_t", label: "T", get: (s) => fund(s, "recepcao").total },
      { key: "rec_e", label: "Err", get: (s) => fund(s, "recepcao").erros },
    ],
  },
  {
    group: "Lev.",
    cols: [
      { key: "lev_t", label: "T", get: (s) => fund(s, "levantamento").total },
      { key: "lev_p", label: "Pt", get: (s) => fund(s, "levantamento").pontos },
      { key: "lev_e", label: "Err", get: (s) => fund(s, "levantamento").erros },
    ],
  },
  {
    group: "Ataque",
    cols: [
      { key: "atk_t", label: "T", get: (s) => fund(s, "ataque").total },
      { key: "atk_p", label: "Pt", get: (s) => fund(s, "ataque").pontos },
      {
        key: "atk_pos",
        label: "Pos",
        get: (s) => {
          const a = fund(s, "ataque")
          return a.total - a.pontos - a.erros
        },
      },
      { key: "atk_e", label: "Err", get: (s) => fund(s, "ataque").erros },
    ],
  },
  {
    group: "Bloqueio",
    cols: [
      { key: "blo_t", label: "T", get: (s) => fund(s, "bloqueio").total },
      { key: "blo_p", label: "Pt", get: (s) => fund(s, "bloqueio").pontos },
      {
        key: "blo_pos",
        label: "Pos",
        get: (s) => {
          const b = fund(s, "bloqueio")
          return b.total - b.pontos - b.erros
        },
      },
      { key: "blo_e", label: "Err", get: (s) => fund(s, "bloqueio").erros },
    ],
  },
  {
    group: "Defesa",
    cols: [
      { key: "def_t", label: "T", get: (s) => fund(s, "defesa").total },
      { key: "def_atk", label: "Atq", get: (s) => s.defesaPorTipo.ataque },
      { key: "def_vol", label: "Vol", get: (s) => s.defesaPorTipo.volume },
      { key: "def_rec", label: "Rec", get: (s) => s.defesaPorTipo.recuperacao },
    ],
  },
]

const FLAT_COLS = COLS.flatMap((g) => g.cols)

function TeamTable({ team, stats }: { team: TeamSide; stats: PlayerStat[] }) {
  // Totais (RESULTADO GERAL) por coluna.
  const colTotals: Record<string, number> = {}
  FLAT_COLS.forEach((c) => {
    colTotals[c.key] = stats.reduce((acc, s) => acc + c.get(s), 0)
  })
  // Pontos conquistados pela equipe (base do TGP = % de participação nos pontos).
  const teamPts = stats.reduce((acc, s) => acc + s.pontos, 0)
  // TP = todas as ações do atleta EXCETO os erros (saque, ace, passe, defesa,
  // bloqueio, ataque, levantamento... tudo que não é erro).
  const totTP = stats.reduce((acc, s) => acc + (s.total - s.erros), 0)
  const totTE = stats.reduce((acc, s) => acc + s.erros, 0)
  // A soma das participações de todos os atletas equivale a 100% dos pontos.
  const totTGP = teamPts === 0 ? 0 : 100

  const accent = TEAM_STYLE[team].hex

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: `${accent}14` }}
      >
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <h3 className="text-base font-bold text-slate-800">{TEAM_LABEL[team]}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            {/* Linha de grupos */}
            <tr className="text-white" style={{ background: "#2563eb" }}>
              <th rowSpan={2} className="border border-blue-500 px-2 py-2 text-xs font-bold">
                Nº
              </th>
              <th
                rowSpan={2}
                className="border border-blue-500 px-3 py-2 text-left text-xs font-bold"
              >
                Atleta
              </th>
              {COLS.map((g) => (
                <th
                  key={g.group}
                  colSpan={g.cols.length}
                  className="border border-blue-500 px-2 py-1.5 text-xs font-bold uppercase tracking-wide"
                >
                  {g.group}
                </th>
              ))}
              <th rowSpan={2} className="border border-blue-500 px-2 py-2 text-xs font-bold">
                TP
              </th>
              <th rowSpan={2} className="border border-blue-500 px-2 py-2 text-xs font-bold">
                TE
              </th>
              <th
                rowSpan={2}
                className="border border-blue-500 px-2 py-2 text-xs font-bold"
                style={{ background: "#1d4ed8" }}
              >
                TGP
              </th>
            </tr>
            {/* Linha de subcolunas */}
            <tr className="text-white" style={{ background: "#3b82f6" }}>
              {FLAT_COLS.map((c) => (
                <th
                  key={c.key}
                  className="border border-blue-400 px-2 py-1 text-[11px] font-semibold"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, idx) => {
              const tp = s.total - s.erros
              // TGP = participação do atleta nos PONTOS da equipe. Usa os pontos
              // do atleta sobre o total de pontos do time, então a soma dá 100%.
              const tgp = teamPts === 0 ? 0 : Math.round((s.pontos / teamPts) * 100)
              return (
                <tr
                  key={s.player.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="border border-slate-200 px-2 py-2 font-bold tabular-nums">
                    <span style={{ color: accent }}>{s.player.number}</span>
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
                    {s.player.name}
                  </td>
                  {FLAT_COLS.map((c) => {
                    const v = c.get(s)
                    return (
                      <td
                        key={c.key}
                        className={`border border-slate-200 px-2 py-2 tabular-nums ${
                          v === 0 ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        {v}
                      </td>
                    )
                  })}
                  <td className="border border-slate-200 px-2 py-2 font-bold tabular-nums text-emerald-600">
                    {tp}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 font-bold tabular-nums text-red-600">
                    {s.erros}
                  </td>
                  <td
                    className={`border border-slate-200 px-2 py-2 font-bold tabular-nums ${tgpColor(tgp)}`}
                    style={{ background: "#fef9c3" }}
                  >
                    {tgp}%
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold text-slate-800" style={{ background: "#fef08a" }}>
              <td className="border border-amber-300 px-2 py-2" colSpan={2}>
                RESULTADO GERAL
              </td>
              {FLAT_COLS.map((c) => (
                <td key={c.key} className="border border-amber-300 px-2 py-2 tabular-nums">
                  {colTotals[c.key]}
                </td>
              ))}
              <td className="border border-amber-300 px-2 py-2 tabular-nums text-emerald-700">
                {totTP}
              </td>
              <td className="border border-amber-300 px-2 py-2 tabular-nums text-red-700">
                {totTE}
              </td>
              <td className={`border border-amber-300 px-2 py-2 tabular-nums ${tgpColor(totTGP)}`}>
                {totTGP}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export function ScoutReport({ actions, players, onBackToValidation }: ScoutReportProps) {
  const [athleteFilter, setAthleteFilter] = useState<string>("todos")
  const [fundamentoFilter, setFundamentoFilter] = useState<Fundamento | "todos">("todos")
  const [teamFilter, setTeamFilter] = useState<TeamSide | "todos">("todos")

  const playerById = useMemo(() => {
    const map = new Map<string, Player>()
    players.forEach((p) => map.set(p.id, p))
    return map
  }, [players])

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (athleteFilter !== "todos" && a.playerId !== athleteFilter) return false
      if (fundamentoFilter !== "todos" && a.fundamento !== fundamentoFilter) return false
      if (teamFilter !== "todos") {
        const p = a.playerId ? playerById.get(a.playerId) : null
        if (!p || p.team !== teamFilter) return false
      }
      return true
    })
  }, [actions, athleteFilter, fundamentoFilter, teamFilter, playerById])

  const summary = useMemo(
    () => computeSummary(filteredActions, players),
    [filteredActions, players],
  )

  const breakdowns = useMemo(() => computeBreakdowns(filteredActions), [filteredActions])

  // Agrupa jogadores por equipe para as planilhas separadas.
  const teamsToShow = useMemo<TeamSide[]>(() => {
    const all: TeamSide[] = ["casa", "adversario"]
    return teamFilter === "todos" ? all : [teamFilter]
  }, [teamFilter])

  const statsByTeam = useMemo(() => {
    const map: Record<TeamSide, PlayerStat[]> = { casa: [], adversario: [] }
    summary.jogadores.forEach((s) => map[s.player.team].push(s))
    return map
  }, [summary.jogadores])

  function exportCSV() {
    const header = [
      "Equipe",
      "Numero",
      "Atleta",
      ...FLAT_COLS.map((c) => c.key),
      "TP",
      "TE",
      "TGP_%",
    ]
    // Pontos por equipe (base do TGP) para o cálculo da % de participação.
    const teamPtsMap: Record<TeamSide, number> = { casa: 0, adversario: 0 }
    summary.jogadores.forEach((s) => {
      teamPtsMap[s.player.team] += s.pontos
    })
    const rows = summary.jogadores.map((s) => {
      const tp = s.total - s.erros
      const teamPts = teamPtsMap[s.player.team]
      const tgp = teamPts === 0 ? 0 : Math.round((s.pontos / teamPts) * 100)
      return [
        TEAM_LABEL[s.player.team],
        s.player.number,
        s.player.name,
        ...FLAT_COLS.map((c) => c.get(s)),
        tp,
        s.erros,
        tgp,
      ]
    })
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "scout-planilha.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToValidation}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para validação
        </button>
        <div className="flex flex-wrap gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value as TeamSide | "todos")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
            aria-label="Filtrar por equipe"
          >
            <option value="todos">Ambas as equipes</option>
            <option value="casa">Casa</option>
            <option value="adversario">Adversário</option>
          </select>
          <select
            value={fundamentoFilter}
            onChange={(e) => setFundamentoFilter(e.target.value as Fundamento | "todos")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
            aria-label="Filtrar por fundamento"
          >
            <option value="todos">Todos os fundamentos</option>
            {summary.porFundamento.map((f) => (
              <option key={f.fundamento} value={f.fundamento}>
                {FUNDAMENTO_LABEL[f.fundamento]}
              </option>
            ))}
          </select>
          <select
            value={athleteFilter}
            onChange={(e) => setAthleteFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
            aria-label="Filtrar por atleta"
          >
            <option value="todos">Todos os atletas</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Target className="h-4 w-4 text-blue-600" aria-hidden="true" />}
          label="Ações totais"
          value={summary.totalAcoes}
          accent="bg-blue-100"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
          label="Pontos"
          value={summary.totalPontos}
          accent="bg-emerald-100"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />}
          label="Erros"
          value={summary.totalErros}
          accent="bg-red-100"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-amber-600" aria-hidden="true" />}
          label="Saldo"
          value={summary.totalPontos - summary.totalErros}
          accent="bg-amber-100"
        />
      </div>

      {/* Gráficos */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Gráficos por fundamento
        </h2>
        <ScoutCharts breakdowns={breakdowns} />
      </div>

      {/* Planilhas separadas por equipe */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Planilha por equipe
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              TP = ações certas (tudo exceto erros) · TE = total de erros · TGP = % dos pontos da equipe feitos pelo
              atleta (a soma de todos = 100%)
            </p>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            disabled={summary.jogadores.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>

        {summary.jogadores.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Sem ações atribuídas a atletas para os filtros atuais.
          </div>
        ) : (
          teamsToShow.map((team) =>
            statsByTeam[team].length > 0 ? (
              <TeamTable key={team} team={team} stats={statsByTeam[team]} />
            ) : null,
          )
        )}
      </div>
    </div>
  )
}
