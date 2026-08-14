"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, FileDown, Clock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionDataEntry } from "./action-data-entry"
import { type ActionMatchConfig, createDefaultConfig } from "@/lib/scout-action/config"
import { listActionMatches, deleteActionMatch, type ActionMatch } from "@/lib/scout-action/storage"
import { matchTotals } from "@/lib/scout-action/types"
import { exportActionMatchPdf } from "@/lib/scout-action/export-pdf"

type View = "menu" | "capture"

export function ScoutActionApp() {
  const [view, setView] = useState<View>("menu")
  const [matches, setMatches] = useState<ActionMatch[]>([])
  const [config, setConfig] = useState<ActionMatchConfig | null>(null)

  const refresh = useCallback(() => setMatches(listActionMatches()), [])
  useEffect(() => {
    refresh()
  }, [refresh])

  function startNewScout() {
    // Abre direto no painel com duas equipes padrão; tudo é editável no menu do topo.
    setConfig(createDefaultConfig())
    setView("capture")
  }

  function backToMenu() {
    setConfig(null)
    setView("menu")
    refresh()
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este scout? Esta ação não pode ser desfeita.")) return
    deleteActionMatch(id)
    refresh()
  }

  if (view === "capture" && config) {
    return <ActionDataEntry config={config} onFinish={backToMenu} onExit={backToMenu} />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/scout-volleyball"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar ao Scout
        </Link>
        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
          Scout Action
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Scout Action</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coleta rápida com 3 botões (Ação · Ponto · Erro), rodízio 5x1, líbero e levantadora automáticos.
        </p>
      </div>

      <Button onClick={startNewScout} className="mb-8 w-full gap-2 sm:w-auto">
        <Plus className="size-4" />
        Novo scout
      </Button>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="size-4 text-muted-foreground" />
        Scouts salvos
      </h2>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum scout ainda. Crie o primeiro acima.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => {
            const nameA = m.teamA.name || "Equipe A"
            const nameB = m.teamB.name || "Equipe B"
            const tA = matchTotals(m, "A")
            const tB = matchTotals(m, "B")
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Trophy className="size-4 shrink-0 text-orange-500" />
                    <span className="truncate">
                      {nameA} <span className="text-muted-foreground">x</span> {nameB}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString("pt-BR")} · Sets {m.setsA}-{m.setsB} ·
                    TGP {nameA} {tA.tgp}% / {nameB} {tB.tgp}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => exportActionMatchPdf(m)}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 bg-transparent"
                  >
                    <FileDown className="size-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleDelete(m.id)}
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Excluir scout"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
