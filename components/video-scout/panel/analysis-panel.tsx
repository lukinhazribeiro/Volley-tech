"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  Download,
  History,
  Link2,
  Menu,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import type { Player, Posicao, ScoutAction, TeamSide } from "@/lib/video-scout/types"
import {
  amendLastQuality,
  applyTeamPatch,
  createMatch,
  createTeam,
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
import {
  deletePreset,
  loadPresets,
  presetToTeam,
  savePreset,
  updatePreset,
  type TeamPreset,
} from "@/lib/video-scout/team-presets"
import { VideoPlayer, parseYouTubeId, type VideoPlayerHandle } from "../video-player"
import { ScoutReport } from "../scout-report"
import { VideoScoutModule } from "../video-scout-module"
import { PanelSidebar } from "./panel-sidebar"
import { PanelTeam, type RecordPayload } from "./panel-team"
import { PanelActions } from "./panel-actions"
import { PanelStatsBar } from "./panel-stats-bar"
import { HistoryDialog, SubstitutionDialog, TeamSetupDialog } from "./panel-dialogs"

type View = "painel" | "relatorio" | "ia" | "equipes"

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

  // Biblioteca de equipes salvas (persistida em localStorage).
  const [presets, setPresets] = useState<TeamPreset[]>([])
  // Editor de equipe da biblioteca: cópia de trabalho + id (null = nova equipe).
  const [editorTeam, setEditorTeam] = useState<TeamConfig | null>(null)
  const [editorId, setEditorId] = useState<string | null>(null)
  // Confirmação ao carregar uma equipe salva em quadra (banner + destaque).
  const [loadedInfo, setLoadedInfo] = useState<{ side: TeamSide; name: string } | null>(null)

  useEffect(() => {
    setHistory(loadHistory())
    setPresets(loadPresets())
  }, [])

  // Abre o editor para criar uma equipe nova (do zero).
  const openNewTeam = useCallback(() => {
    setEditorTeam(createTeam("casa", "Nova equipe"))
    setEditorId(null)
  }, [])

  // Abre o editor para uma equipe já salva.
  const openEditPreset = useCallback((preset: TeamPreset) => {
    setEditorTeam(presetToTeam(preset, "casa"))
    setEditorId(preset.id)
  }, [])

  // Aplica alterações à cópia de trabalho do editor.
  const patchEditor = useCallback((patch: Partial<TeamConfig>) => {
    setEditorTeam((prev) => (prev ? applyTeamPatch(prev, patch) : prev))
  }, [])

  // Fecha o editor salvando na biblioteca (cria nova ou atualiza a existente).
  const closeEditor = useCallback(() => {
    if (editorTeam) {
      setPresets(editorId ? updatePreset(editorId, editorTeam) : savePreset(editorTeam.name, editorTeam))
    }
    setEditorTeam(null)
    setEditorId(null)
  }, [editorTeam, editorId])

  const handleLoadPreset = useCallback((preset: TeamPreset, side: TeamSide) => {
    setMatch((prev) => {
      const { side: _s, ...patch } = presetToTeam(preset, side)
      return updateTeam(prev, side, patch)
    })
    setLoadedInfo({ side, name: preset.name })
  }, [])

  const handleDeletePreset = useCallback((id: string) => {
    setPresets(deletePreset(id))
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

  if (view === "equipes") {
    const equipesSetupTeam: TeamConfig | null =
      setupTarget === "casa" ? match.teamA : setupTarget === "adversario" ? match.teamB : null

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {/* Cabeçalho */}
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600">
                <Users className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800">Minhas equipes</h1>
                <p className="text-xs text-slate-500">
                  Cadastre cada equipe uma vez e reutilize em qualquer partida
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView("painel")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Ir para o painel
            </button>
          </header>

          {/* Confirmação de equipe carregada */}
          {loadedInfo && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 text-sm text-emerald-800">
                <span className="font-bold">{loadedInfo.name}</span> carregada como{" "}
                <span className="font-bold">
                  {loadedInfo.side === "casa" ? "Equipe A" : "Equipe B"}
                </span>
                . Já pode coletar no painel.
              </p>
              <button
                type="button"
                onClick={() => setView("painel")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                Ir para o painel
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Em quadra nesta partida */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Em quadra nesta partida
              </h2>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CourtTeamRow
                team={match.teamA}
                accent="blue"
                label="Equipe A"
                loaded={loadedInfo?.side === "casa"}
                onEdit={() => setSetupTarget("casa")}
              />
              <CourtTeamRow
                team={match.teamB}
                accent="pink"
                label="Equipe B"
                loaded={loadedInfo?.side === "adversario"}
                onEdit={() => setSetupTarget("adversario")}
              />
            </div>
          </section>

          {/* Biblioteca de equipes salvas */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Equipes salvas
              </h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {presets.length}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
              <button
                type="button"
                onClick={openNewTeam}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Criar nova equipe
              </button>
            </div>

            {presets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <BookmarkPlus className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-slate-600">Nenhuma equipe cadastrada ainda</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400 text-pretty">
                  Toque em &quot;Criar nova equipe&quot; para montar seu elenco (nomes, números e
                  funções). Depois é só escolher usar como Equipe A ou B em qualquer partida.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {presets.map((preset, i) => (
                  <SavedTeamRow
                    key={preset.id}
                    preset={preset}
                    isFirst={i === 0}
                    onUseA={() => handleLoadPreset(preset, "casa")}
                    onUseB={() => handleLoadPreset(preset, "adversario")}
                    onEdit={() => openEditPreset(preset)}
                    onDelete={() => handleDeletePreset(preset.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Editor da biblioteca (equipe isolada) */}
        {editorTeam && (
          <TeamSetupDialog
            team={editorTeam}
            title={editorId ? "Editar equipe" : "Nova equipe"}
            onChange={patchEditor}
            onClose={closeEditor}
          />
        )}

        {/* Editor das equipes em quadra */}
        {setupTarget && equipesSetupTeam && (
          <TeamSetupDialog
            team={equipesSetupTeam}
            onChange={(patch) => setMatch((prev) => updateTeam(prev, setupTarget, patch))}
            onClose={() => setSetupTarget(null)}
          />
        )}
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
              onClick={() => setView("equipes")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Equipes
            </button>
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
              isServing={match.servingTeam === null ? true : match.servingTeam === "casa"}
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
              isServing={match.servingTeam === null ? true : match.servingTeam === "adversario"}
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

/** Resumo curto do elenco: "14 atletas · 2 centrais · líbero". */
function rosterSummary(players: Player[], hasLibero: boolean): string {
  const parts = [`${players.length} atletas`]
  const centrais = players.filter((p) => p.role === "central").length
  if (centrais > 0) parts.push(`${centrais} ${centrais === 1 ? "central" : "centrais"}`)
  if (hasLibero) parts.push("líbero")
  return parts.join(" · ")
}

/** Linha compacta de uma das equipes em quadra (Equipe A / Equipe B). */
function CourtTeamRow({
  team,
  accent,
  label,
  loaded,
  onEdit,
}: {
  team: TeamConfig
  accent: "blue" | "pink"
  label: string
  loaded: boolean
  onEdit: () => void
}) {
  const accentBar = accent === "blue" ? "bg-blue-500" : "bg-pink-500"
  const accentSoft = accent === "blue" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className={`h-10 w-1.5 shrink-0 rounded-full ${accentBar}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${accentSoft}`}>
            {label}
          </span>
          {loaded && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
              <Check className="h-3 w-3" aria-hidden="true" /> carregada
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{team.name}</p>
        <p className="truncate text-[11px] text-slate-400">
          {rosterSummary(team.players, Boolean(team.liberoId))}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
        Editar
      </button>
    </div>
  )
}

/** Linha de uma equipe salva na biblioteca, com ações de uso/edição/exclusão. */
function SavedTeamRow({
  preset,
  isFirst,
  onUseA,
  onUseB,
  onEdit,
  onDelete,
}: {
  preset: TeamPreset
  isFirst: boolean
  onUseA: () => void
  onUseB: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const players = preset.team.players
  const initials = preset.name.trim().slice(0, 2).toUpperCase() || "EQ"

  return (
    <div
      className={`flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap ${
        isFirst ? "" : "border-t border-slate-100"
      }`}
    >
      {/* Avatar com iniciais */}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700">
        {initials}
      </span>

      {/* Identificação */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{preset.name}</p>
        <p className="truncate text-[11px] text-slate-400">
          {rosterSummary(players, Boolean(preset.team.liberoId))}
        </p>
      </div>

      {/* Ações de uso */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUseA}
          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Usar como </span>A
        </button>
        <button
          type="button"
          onClick={onUseB}
          className="flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-700 transition hover:bg-pink-100 active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Usar como </span>B
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
          aria-label={`Editar ${preset.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          aria-label={`Excluir ${preset.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
