"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { History, Menu, Plus, Sparkles, Upload } from "lucide-react"
import type { Posicao, ScoutAction, TeamSide } from "@/lib/video-scout/types"
import {
  amendLastQuality,
  createMatch,
  quickStats,
  recordAction,
  substitute,
  undoLast,
  updateTeam,
  type MatchState,
  type TeamConfig,
} from "@/lib/video-scout/match"
import {
  deleteFromHistory,
  hasData,
  loadHistory,
  saveToHistory,
  type MatchHistoryEntry,
} from "@/lib/video-scout/history"
import { VideoPlayer, type VideoPlayerHandle } from "../video-player"
import { ScoutReport } from "../scout-report"
import { VideoScoutModule } from "../video-scout-module"
import { PanelSidebar } from "./panel-sidebar"
import { PanelTeam, type RecordPayload } from "./panel-team"
import { PanelActions } from "./panel-actions"
import { PanelStatsBar } from "./panel-stats-bar"
import { HistoryDialog, SubstitutionDialog, TeamSetupDialog } from "./panel-dialogs"

type View = "painel" | "relatorio" | "ia"

export function AnalysisPanel() {
  const [match, setMatch] = useState<MatchState>(() => createMatch())
  const [view, setView] = useState<View>("painel")

  // Vídeo opcional.
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoTimeRef = useRef(0)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Diálogos.
  const [subTarget, setSubTarget] = useState<{ side: TeamSide; pos: Posicao } | null>(null)
  const [setupTarget, setSetupTarget] = useState<TeamSide | null>(null)

  // Histórico de partidas (persistido em localStorage).
  const [history, setHistory] = useState<MatchHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const stats = useMemo(() => quickStats(match), [match])

  const handleRecord = useCallback((side: TeamSide, payload: RecordPayload) => {
    setMatch((prev) =>
      recordAction(prev, {
        team: side,
        posicao: payload.posicao,
        fundamento: payload.fundamento,
        qualidade: payload.qualidade,
        detalhe: payload.detalhe,
        videoTime: videoTimeRef.current,
      }),
    )
  }, [])

  const handleAmend = useCallback((side: TeamSide, quality: "ponto" | "erro") => {
    setMatch((prev) => amendLastQuality(prev, side, quality))
  }, [])

  // Uma equipe pode "corrigir" se sua última ação (não automática) ainda for positiva.
  const canAmend = useMemo(() => {
    const lastOf = (side: TeamSide) => {
      for (let i = match.actions.length - 1; i >= 0; i--) {
        const a = match.actions[i]
        if (a.team === side && !a.auto) return a
      }
      return null
    }
    const amendable = (side: TeamSide) => {
      const a = lastOf(side)
      return !!a && a.qualidade !== "ponto" && a.qualidade !== "erro"
    }
    return { casa: amendable("casa"), adversario: amendable("adversario") }
  }, [match.actions])

  const handleDelete = useCallback((id: string) => {
    setMatch((prev) => ({ ...prev, actions: prev.actions.filter((a) => a.id !== id) }))
  }, [])

  const handleUndo = useCallback(() => setMatch((prev) => undoLast(prev)), [])

  const handleVideoSelect = useCallback(
    (file: File) => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setVideoUrl(URL.createObjectURL(file))
    },
    [videoUrl],
  )

  // Salva a partida atual no histórico (se tiver dados) para não misturar com
  // a próxima, e retorna se algo foi salvo.
  const archiveCurrent = useCallback(() => {
    if (hasData(match)) {
      setHistory(saveToHistory(match))
      return true
    }
    return false
  }, [match])

  function newMatch() {
    archiveCurrent()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setMatch(createMatch())
    setView("painel")
  }

  function openHistoryEntry(entry: MatchHistoryEntry) {
    // Guarda a partida em andamento antes de abrir uma do histórico.
    archiveCurrent()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setMatch(entry.match)
    setShowHistory(false)
    setView("relatorio")
  }

  function removeHistoryEntry(id: string) {
    setHistory(deleteFromHistory(id))
  }

  const allPlayers = useMemo(
    () => [...match.teamA.players, ...match.teamB.players],
    [match.teamA.players, match.teamB.players],
  )

  // Para o relatório, usa apenas ações com atleta atribuído (mantém auto-levantamento).
  const reportActions: ScoutAction[] = match.actions

  if (view === "ia") {
    return <VideoScoutModule onExit={() => setView("painel")} />
  }

  if (view === "relatorio") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <ScoutReport
            actions={reportActions}
            players={allPlayers}
            onBackToValidation={() => setView("painel")}
          />
        </div>
      </div>
    )
  }

  const subTeam: TeamConfig | null =
    subTarget?.side === "casa"
      ? match.teamA
      : subTarget?.side === "adversario"
        ? match.teamB
        : null
  const setupTeam: TeamConfig | null =
    setupTarget === "casa" ? match.teamA : setupTarget === "adversario" ? match.teamB : null

  return (
    <div className="flex min-h-screen bg-[#070a14] text-slate-100">
      <PanelSidebar
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        onEditTeam={(side) => setSetupTarget(side)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-slate-400 lg:hidden" aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-wide text-slate-100">
              PAINEL DE ANÁLISE
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHistory(loadHistory())
                setShowHistory(true)
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              <History className="h-4 w-4 text-violet-400" aria-hidden="true" />
              Histórico
            </button>
            <button
              type="button"
              onClick={newMatch}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova Partida
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr_1fr]">
            {/* Equipe A */}
            <PanelTeam
              team={match.teamA}
              accent="blue"
              onRecord={(p) => handleRecord("casa", p)}
              onAmend={(q) => handleAmend("casa", q)}
              canAmend={canAmend.casa}
              onSubstitute={(pos) => setSubTarget({ side: "casa", pos })}
              onOpenLibero={() => setSetupTarget("casa")}
            />

            {/* Centro: vídeo + ações */}
            <div className="flex min-h-0 flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-[#0e1322] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-violet-400">
                    Vídeo
                  </h2>
                  <button
                    type="button"
                    onClick={() => setView("ia")}
                    className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Análise por IA
                  </button>
                </div>
                {videoUrl ? (
                  <VideoPlayer
                    ref={playerRef}
                    src={videoUrl}
                    onTimeUpdate={(t) => {
                      videoTimeRef.current = t
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500"
                  >
                    <Upload className="h-7 w-7" aria-hidden="true" />
                    <span className="text-sm font-medium">Carregar vídeo (opcional)</span>
                    <span className="text-xs text-slate-500">
                      Você também pode registrar sem vídeo
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleVideoSelect(f)
                  }}
                />
              </div>

              <PanelActions
                actions={match.actions}
                onDelete={handleDelete}
                onUndo={handleUndo}
              />
            </div>

            {/* Equipe B */}
            <PanelTeam
              team={match.teamB}
              accent="pink"
              onRecord={(p) => handleRecord("adversario", p)}
              onAmend={(q) => handleAmend("adversario", q)}
              canAmend={canAmend.adversario}
              onSubstitute={(pos) => setSubTarget({ side: "adversario", pos })}
              onOpenLibero={() => setSetupTarget("adversario")}
            />
          </div>

          <PanelStatsBar {...stats} onReport={() => setView("relatorio")} />
        </main>
      </div>

      {subTarget && subTeam && (
        <SubstitutionDialog
          team={subTeam}
          posicao={subTarget.pos}
          onSubstitute={(newId) =>
            setMatch((prev) => substitute(prev, subTarget.side, subTarget.pos, newId))
          }
          onClose={() => setSubTarget(null)}
        />
      )}

      {setupTarget && setupTeam && (
        <TeamSetupDialog
          team={setupTeam}
          onChange={(patch) => setMatch((prev) => updateTeam(prev, setupTarget, patch))}
          onClose={() => setSetupTarget(null)}
        />
      )}

      {showHistory && (
        <HistoryDialog
          entries={history}
          onOpen={openHistoryEntry}
          onDelete={removeHistoryEntry}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
