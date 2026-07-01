"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, History, Link2, Menu, Plus, Sparkles, Upload, X } from "lucide-react"
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
import { VideoPlayer, parseYouTubeId, type VideoPlayerHandle } from "../video-player"
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

  // Vídeo opcional: pode ser um arquivo (blob) ou um link (YouTube / URL direta).
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const isBlobRef = useRef(false)
  const [linkInput, setLinkInput] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const videoTimeRef = useRef(0)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Diálogos.
  const [subTarget, setSubTarget] = useState<{ side: TeamSide; pos: Posicao } | null>(null)
  const [setupTarget, setSetupTarget] = useState<TeamSide | null>(null)

  // Histórico de partidas (persistido em localStorage).
  const [history, setHistory] = useState<MatchHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const clearVideo = useCallback(() => {
    if (videoUrl && isBlobRef.current) URL.revokeObjectURL(videoUrl)
    isBlobRef.current = false
    setVideoUrl(null)
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (videoUrl && isBlobRef.current) URL.revokeObjectURL(videoUrl)
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
      if (videoUrl && isBlobRef.current) URL.revokeObjectURL(videoUrl)
      isBlobRef.current = true
      setLinkError(null)
      setVideoUrl(URL.createObjectURL(file))
    },
    [videoUrl],
  )

  const handleLinkLoad = useCallback(() => {
    const url = linkInput.trim()
    if (!url) return
    const isYouTube = !!parseYouTubeId(url)
    const isHttp = /^https?:\/\//i.test(url)
    if (!isYouTube && !isHttp) {
      setLinkError("Cole um link do YouTube ou uma URL de vídeo (.mp4) válida.")
      return
    }
    if (videoUrl && isBlobRef.current) URL.revokeObjectURL(videoUrl)
    isBlobRef.current = false
    setLinkError(null)
    setVideoUrl(url)
  }, [linkInput, videoUrl])

  const archiveCurrent = useCallback(() => {
    if (hasData(match)) {
      setHistory(saveToHistory(match))
      return true
    }
    return false
  }, [match])

  function newMatch() {
    archiveCurrent()
    clearVideo()
    setLinkInput("")
    setMatch(createMatch())
    setView("painel")
  }

  function openHistoryEntry(entry: MatchHistoryEntry) {
    archiveCurrent()
    clearVideo()
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

  const reportActions: ScoutAction[] = match.actions

  if (view === "ia") {
    return <VideoScoutModule onExit={() => setView("painel")} />
  }

  if (view === "relatorio") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
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
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <PanelSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        onEditTeam={(side) => {
          setSetupTarget(side)
          setSidebarOpen(false)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-orange-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4 text-orange-600" aria-hidden="true" />
              <span className="hidden sm:inline">Voltar para a Hub</span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Abrir menu de equipes"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="text-lg font-bold tracking-wide text-slate-800">PAINEL DE ANÁLISE</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHistory(loadHistory())
                setShowHistory(true)
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <History className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Histórico
            </button>
            <button
              type="button"
              onClick={newMatch}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
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
              <div className="rounded-xl border border-orange-100 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-orange-600">
                    Vídeo
                  </h2>
                  <button
                    type="button"
                    onClick={() => setView("ia")}
                    className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Análise por IA (opcional)
                  </button>
                </div>

                {videoUrl ? (
                  <div className="space-y-2">
                    <VideoPlayer
                      ref={playerRef}
                      src={videoUrl}
                      onTimeUpdate={(t) => {
                        videoTimeRef.current = t
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        clearVideo()
                        setLinkInput("")
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Remover vídeo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-orange-300 hover:bg-orange-50/40"
                    >
                      <Upload className="h-7 w-7" aria-hidden="true" />
                      <span className="text-sm font-medium">Carregar vídeo do dispositivo</span>
                      <span className="text-xs text-slate-400">
                        Tudo é opcional — você também pode registrar sem vídeo
                      </span>
                    </button>

                    {/* Link do YouTube / URL direta */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Link2
                            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                          />
                          <input
                            type="url"
                            inputMode="url"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleLinkLoad()
                            }}
                            placeholder="Cole o link do YouTube (ou URL .mp4)"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                            aria-label="Link do vídeo"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleLinkLoad}
                          className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                        >
                          Carregar
                        </button>
                      </div>
                      {linkError && <p className="text-xs text-red-600">{linkError}</p>}
                    </div>
                  </div>
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

              <PanelActions actions={match.actions} onDelete={handleDelete} onUndo={handleUndo} />
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
