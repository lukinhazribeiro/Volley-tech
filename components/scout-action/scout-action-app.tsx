"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, History, ArrowLeft, FileDown, Trash2, Trophy, Plus } from "lucide-react"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { ActionSetup, type ActionMatchConfig } from "./action-setup"
import { ActionDataEntry } from "./action-data-entry"
import { getActionMatches, deleteActionMatch } from "@/lib/scout-action/storage"
import { exportActionMatchPdf } from "@/lib/scout-action/export-pdf"
import { computePlayerMetrics, type ScoutActionMatch } from "@/lib/scout-action/types"

type View = "menu" | "setup" | "collecting" | "history"

export default function ScoutActionApp() {
  const router = useRouter()
  const [view, setView] = useState<View>("menu")
  const [config, setConfig] = useState<ActionMatchConfig | null>(null)
  const [matches, setMatches] = useState<ScoutActionMatch[]>([])

  function refreshMatches() {
    setMatches(getActionMatches())
  }

  useEffect(() => {
    refreshMatches()
  }, [])

  function handleStart(cfg: ActionMatchConfig) {
    setConfig(cfg)
    setView("collecting")
  }

  function handleFinish() {
    refreshMatches()
    setConfig(null)
    setView("history")
  }

  // Painel de coleta em tela cheia
  if (view === "collecting" && config) {
    return (
      <div className="min-h-screen bg-slate-950">
        <ActionDataEntry config={config} onFinish={handleFinish} onExit={() => setView("menu")} />
      </div>
    )
  }

  if (view === "setup") {
    return (
      <div className="min-h-screen bg-slate-950">
        <ActionSetup onStart={handleStart} onBack={() => setView("menu")} />
      </div>
    )
  }

  if (view === "history") {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <button
            onClick={() => setView("menu")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Menu
          </button>
          <h1 className="mb-1 text-2xl font-bold text-white">Histórico — Scout Action</h1>
          <p className="mb-6 text-sm text-slate-400">
            Exporte o relatório em PDF ou envie para o Volley Hub pelo assistente de importação.
          </p>

          {matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
              <p className="text-sm text-slate-500">Nenhuma coleta salva ainda.</p>
              <button
                onClick={() => setView("setup")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                <Plus className="h-4 w-4" />
                Nova coleta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <ActionHistoryRow key={m.id} match={m} onDeleted={refreshMatches} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Menu
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-8 text-center text-white">
            <VolleyTechLogo className="mb-3 h-14 w-14 text-white" />
            <h1 className="mb-2 text-4xl font-bold">Scout Action</h1>
            <p className="text-sm text-cyan-100">Coleta inteligente — Ação, Ponto e Erro</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView("setup")}
              className="group flex w-full items-center gap-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-left text-white shadow-lg transition-all hover:-translate-y-1 hover:from-cyan-700 hover:to-blue-700 active:translate-y-0"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Zap className="h-7 w-7" />
              </span>
              <span>
                <span className="mb-1 block text-xl font-bold">Nova coleta</span>
                <span className="block text-sm text-cyan-100">
                  Painel com 3 botões, rodízio 5x1 e levantamento automáticos
                </span>
              </span>
            </button>

            <button
              onClick={() => setView("history")}
              className="group flex w-full items-center gap-4 rounded-lg border border-cyan-500/40 bg-slate-800 p-6 text-left text-white shadow-lg transition-all hover:-translate-y-1 hover:border-cyan-500 active:translate-y-0"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <History className="h-7 w-7 text-cyan-400" />
              </span>
              <span>
                <span className="mb-1 block text-xl font-bold">Histórico</span>
                <span className="block text-sm text-slate-300">Partidas salvas, PDF e envio ao Hub</span>
              </span>
            </button>

            <button
              onClick={() => router.push("/scout-volleyball")}
              className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Voltar ao Scout Volleyball
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionHistoryRow({ match, onDeleted }: { match: ScoutActionMatch; onDeleted: () => void }) {
  const setsA = match.sets.filter((s) => s.scoreA > s.scoreB).length
  const setsB = match.sets.filter((s) => s.scoreB > s.scoreA).length
  const topScorer = match.teamAPlayers
    .map((p) => ({ p, m: computePlayerMetrics(match.events, "A", p.number) }))
    .sort((a, b) => b.m.tgp - a.m.tgp)[0]

  function handleDelete() {
    if (confirm("Excluir esta coleta? Esta ação não pode ser desfeita.")) {
      deleteActionMatch(match.id)
      onDeleted()
    }
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {match.teamAName} <span className="text-slate-500">vs</span> {match.teamBName}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            {setsA} — {setsB} sets
            {match.category ? ` · ${match.category}` : ""}
            {match.completedAt ? ` · ${new Date(match.completedAt).toLocaleDateString("pt-BR")}` : ""}
          </p>
          {topScorer && topScorer.m.tgp > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              Destaque: {topScorer.p.name} (TGP {topScorer.m.tgp}%)
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => exportActionMatchPdf(match)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-600 px-3 text-xs font-medium text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400"
            aria-label="Excluir coleta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
