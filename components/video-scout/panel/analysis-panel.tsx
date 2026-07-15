"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  Download,
  Flag,
  History,
  Menu,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Users,
} from "lucide-react"
import type { Player, Posicao, ScoutAction, TeamSide } from "@/lib/video-scout/types"
import {
  amendLastQuality,
  applyTeamPatch,
  createMatch,
  createTeam,
  nextSet,
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
  migrateLocalHistory,
  saveToHistory,
  subscribeToHistory,
  type MatchHistoryEntry,
} from "@/lib/video-scout/history"
import {
  deletePreset,
  loadPresets,
  migrateLocalPresets,
  presetToTeam,
  savePreset,
  subscribeToPresets,
  updatePreset,
  type TeamPreset,
} from "@/lib/video-scout/team-presets"
import {
  clearLive,
  loadLiveSessions,
  publishLive,
  subscribeToLive,
  type LiveSession,
} from "@/lib/video-scout/live-session"
import { ScoutReport } from "../scout-report"
import { PanelSidebar } from "./panel-sidebar"
import { PanelTeam, type RecordPayload } from "./panel-team"
import { PanelActions } from "./panel-actions"
import { PanelStatsBar } from "./panel-stats-bar"
import { HistoryDialog, SubstitutionDialog, TeamSetupDialog } from "./panel-dialogs"

type View = "painel" | "relatorio" | "equipes" | "ao_vivo"

export function AnalysisPanel() {
  const [match, setMatch] = useState<MatchState>(() => createMatch())
  const [view, setView] = useState<View>("painel")

  // Transmissões ao vivo de OUTROS dispositivos da mesma conta.
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  // Dispositivo cuja coleta estamos assistindo ao vivo (null = nenhum).
  const [watchingDeviceId, setWatchingDeviceId] = useState<string | null>(null)

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
    let active = true

    async function init() {
      // Migra dados antigos do dispositivo (localStorage) para a conta uma vez.
      await Promise.all([migrateLocalPresets(), migrateLocalHistory()])
      const [hist, pres] = await Promise.all([loadHistory(), loadPresets()])
      if (!active) return
      setHistory(hist)
      setPresets(pres)
    }
    init()

    // Sincronização em tempo real entre dispositivos/sessões simultâneas.
    const unsubPresets = subscribeToPresets(() => {
      loadPresets().then((p) => {
        if (active) setPresets(p)
      })
    })
    const unsubHistory = subscribeToHistory(() => {
      loadHistory().then((h) => {
        if (active) setHistory(h)
      })
    })

    // Transmissões ao vivo: carrega, assina mudanças e revalida periodicamente
    // (para descartar sessões que ficaram paradas / offline).
    const refreshLive = () => {
      loadLiveSessions().then((s) => {
        if (active) setLiveSessions(s)
      })
    }
    refreshLive()
    const unsubLive = subscribeToLive(refreshLive)
    const liveInterval = window.setInterval(refreshLive, 12_000)

    return () => {
      active = false
      unsubPresets()
      unsubHistory()
      unsubLive()
      window.clearInterval(liveInterval)
    }
  }, [])

  // Referência sempre atualizada da partida (para o heartbeat abaixo).
  const matchRef = useRef(match)
  matchRef.current = match

  // Publica a partida em andamento ao vivo (sempre transmitir). Debounce para
  // não gerar escrita a cada clique; encerra a transmissão quando a partida
  // está vazia (recém-criada) e ao sair da tela.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (hasData(match)) publishLive(match)
      else clearLive()
    }, 600)
    return () => window.clearTimeout(t)
  }, [match])

  // Heartbeat: reenvia a partida a cada 15s mesmo SEM mudanças, para a
  // transmissão não cair durante os tempos técnicos (quando a coleta para).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (hasData(matchRef.current)) publishLive(matchRef.current)
    }, 15_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      clearLive()
    }
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
  const closeEditor = useCallback(async () => {
    const team = editorTeam
    const id = editorId
    setEditorTeam(null)
    setEditorId(null)
    if (team) {
      const next = id ? await updatePreset(id, team) : await savePreset(team.name, team)
      setPresets(next)
    }
  }, [editorTeam, editorId])

  const handleLoadPreset = useCallback((preset: TeamPreset, side: TeamSide) => {
    setMatch((prev) => {
      const { side: _s, ...patch } = presetToTeam(preset, side)
      return updateTeam(prev, side, patch)
    })
    setLoadedInfo({ side, name: preset.name })
  }, [])

  const handleDeletePreset = useCallback(async (id: string) => {
    setPresets(await deletePreset(id))
  }, [])

  const stats = useMemo(() => quickStats(match), [match])

  const handleRecord = useCallback((side: TeamSide, payload: RecordPayload) => {
    setMatch((prev) =>
      recordAction(prev, {
        team: side,
        posicao: payload.posicao,
        fundamento: payload.fundamento,
        qualidade: payload.qualidade,
        detalhe: payload.detalhe,
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

  const archiveCurrent = useCallback(async () => {
    if (hasData(match)) {
      setHistory(await saveToHistory(match))
      return true
    }
    return false
  }, [match])

  async function newMatch() {
    await archiveCurrent()
    setMatch(createMatch())
    setView("painel")
  }

  // Encerra o set atual: salva o set no histórico (separadamente) e avança para
  // o próximo, mantendo as equipes. Suporta jogos de 2 a 5 sets.
  async function endSet() {
    if (!hasData(match)) return
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Encerrar o Set ${match.set}? O set será salvo no histórico e um novo set começará com o placar zerado.`,
      )
    ) {
      return
    }
    setHistory(await saveToHistory(match))
    setMatch((prev) => nextSet(prev))
    setView("painel")
  }

  async function openHistoryEntry(entry: MatchHistoryEntry) {
    await archiveCurrent()
    setMatch(entry.match)
    setShowHistory(false)
    setView("relatorio")
  }

  async function removeHistoryEntry(id: string) {
    setHistory(await deleteFromHistory(id))
  }

  const allPlayers = useMemo(
    () => [...match.teamA.players, ...match.teamB.players],
    [match.teamA.players, match.teamB.players],
  )

  const reportActions: ScoutAction[] = match.actions

  // Sessão ao vivo atualmente assistida (derivada da lista em tempo real).
  const watchedSession = watchingDeviceId
    ? liveSessions.find((s) => s.deviceId === watchingDeviceId) ?? null
    : null

  // Assistindo a coleta de outro dispositivo ao vivo.
  if (watchingDeviceId) {
    if (!watchedSession) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-700">
          <Radio className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="max-w-sm text-balance text-sm">
            A transmissão ao vivo foi encerrada ou o outro dispositivo ficou sem conexão.
          </p>
          <button
            type="button"
            onClick={() => setWatchingDeviceId(null)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Voltar
          </button>
        </div>
      )
    }
    const livePlayers = [...watchedSession.match.teamA.players, ...watchedSession.match.teamB.players]
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <p className="text-sm font-semibold text-red-700">
                AO VIVO · {watchedSession.deviceLabel} · {watchedSession.teamAName} {watchedSession.scoreA}
                {" × "}
                {watchedSession.scoreB} {watchedSession.teamBName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWatchingDeviceId(null)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Sair da transmissão
            </button>
          </div>
          <ScoutReport
            actions={watchedSession.match.actions}
            players={livePlayers}
            teamAName={watchedSession.match.teamA.name}
            teamBName={watchedSession.match.teamB.name}
            onBackToValidation={() => setWatchingDeviceId(null)}
          />
        </div>
      </div>
    )
  }

  // Lista de transmissões ao vivo disponíveis (escolher qual assistir).
  if (view === "ao_vivo") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
                <Radio className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Coletas ao vivo</h1>
                <p className="text-xs text-slate-500">
                  Acompanhe em tempo real a coleta feita em outro dispositivo da sua conta.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView("painel")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Voltar
            </button>
          </header>

          {liveSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <Radio className="h-9 w-9 text-slate-300" aria-hidden="true" />
              <p className="max-w-sm text-balance text-sm text-slate-500">
                Nenhuma coleta ao vivo no momento. Quando outro dispositivo logado na sua conta começar a
                registrar uma partida, ela aparecerá aqui automaticamente.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {liveSessions.map((s) => (
                <li key={s.deviceId}>
                  <button
                    type="button"
                    onClick={() => setWatchingDeviceId(s.deviceId)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-red-300 hover:bg-red-50/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {s.teamAName} {s.scoreA} × {s.scoreB} {s.teamBName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {s.deviceLabel} · Set {s.setNum} · {s.match.actions.length} ações
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Assistir
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  if (view === "relatorio") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <ScoutReport
            actions={reportActions}
            players={allPlayers}
            teamAName={match.teamA.name}
            teamBName={match.teamB.name}
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
            {liveSessions.length > 0 && (
              <button
                type="button"
                onClick={() => setView("ao_vivo")}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                Ao vivo
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                  {liveSessions.length}
                </span>
              </button>
            )}
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
                setShowHistory(true)
                loadHistory().then(setHistory)
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

            {/* Centro: placar ao vivo + lista de ações */}
            <div className="flex min-h-0 flex-col gap-4">
              {/* Placar ao vivo */}
              <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-700">
                    Set {match.set}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex min-w-0 flex-1 flex-col items-end text-right">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {match.teamA.name}
                    </span>
                    <span className="text-3xl font-bold tabular-nums text-slate-800">
                      {stats.pontosA}
                    </span>
                    {(match.servingTeam === null || match.servingTeam === "casa") && (
                      <span className="text-[10px] font-medium text-slate-400">saque</span>
                    )}
                  </div>
                  <span className="text-2xl font-light text-slate-300">×</span>
                  <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-pink-600">
                      {match.teamB.name}
                    </span>
                    <span className="text-3xl font-bold tabular-nums text-slate-800">
                      {stats.pontosB}
                    </span>
                    {match.servingTeam === "adversario" && (
                      <span className="text-[10px] font-medium text-slate-400">saque</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-center border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={endSet}
                    disabled={!hasData(match)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    Encerrar Set {match.set}
                  </button>
                </div>
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
