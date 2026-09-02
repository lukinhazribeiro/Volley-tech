"use client"

// Espectador ao vivo do Scout Volleibol.
//
// Botão "Ao vivo" (com contador) exibido na coleta. Ao tocar, lista as coletas
// em andamento em OUTROS aparelhos logados na MESMA conta e permite acompanhar
// placar, estatísticas, planilha e gráficos em tempo real (somente leitura) —
// para o técnico ver os números enquanto o analista coleta em outro aparelho.

import { useEffect, useState } from "react"
import { Radio, X, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/scout/ui/button"
import {
  loadVoleiLiveSessions,
  subscribeToVoleiLive,
  type VoleiLiveSession,
} from "@/lib/scout/live-session"
import { calculateMatchStats, type MatchAction } from "@/lib/scout/match-parser"
import type { Set } from "@/lib/scout/set-manager"
import ModernStatsDashboard from "@/components/scout/heatmaps/modern-stats-dashboard"
import PlayerStatsSpreadsheet from "@/components/scout/spreadsheets/player-stats-spreadsheet"
import AdvancedAnalyticsCharts from "@/components/scout/charts/advanced-analytics-charts"
import TransitionsDashboard from "@/components/scout/transitions-dashboard"

const TABS = [
  { value: "stats", label: "Estatísticas" },
  { value: "spreadsheet", label: "Planilha" },
  { value: "charts", label: "Gráficos" },
  { value: "transitions", label: "Transições" },
] as const

type TabValue = (typeof TABS)[number]["value"]

export default function VoleiLiveWatch() {
  const [sessions, setSessions] = useState<VoleiLiveSession[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [watchingId, setWatchingId] = useState<string | null>(null)
  const [tab, setTab] = useState<TabValue>("stats")
  // Último dado recebido do dispositivo assistido. Retido para que os NÚMEROS
  // NUNCA caiam durante uma parada (tempo técnico, troca de lado, sem sinal).
  const [watched, setWatched] = useState<VoleiLiveSession | null>(null)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    let active = true
    const refresh = () => {
      loadVoleiLiveSessions().then((s) => {
        if (active) setSessions(s)
      })
    }
    refresh()
    const unsub = subscribeToVoleiLive(refresh)
    const interval = window.setInterval(refresh, 12_000)
    return () => {
      active = false
      unsub()
      window.clearInterval(interval)
    }
  }, [])

  // Atualiza o dado assistido quando chega algo novo; se a linha sumiu (o
  // coletor encerrou de fato), marca como encerrado mas mantém o último dado.
  useEffect(() => {
    if (!watchingId) return
    const fresh = sessions.find((s) => s.deviceId === watchingId)
    if (fresh) {
      setWatched(fresh)
      setEnded(false)
    } else if (watched) {
      setEnded(true)
    }
  }, [sessions, watchingId, watched])

  if (watchingId) {
    if (!watched) {
      return (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
          <Radio className="size-10 text-muted-foreground" aria-hidden />
          <p className="max-w-sm text-balance text-sm text-muted-foreground">
            Aguardando os dados desta coleta...
          </p>
          <Button
            onClick={() => {
              setWatchingId(null)
              setEnded(false)
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Voltar
          </Button>
        </div>
      )
    }

    // "Parada" (sem pulso) ou encerrada: os números continuam, só avisamos.
    const paused = ended || watched.stale
    const snap = watched.snapshot
    const actions = (snap.actions ?? []) as MatchAction[]
    const sets = (snap.sets ?? []) as unknown as Set[]
    const stats = calculateMatchStats(actions)

    return (
      <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background">
        {/* Selo AO VIVO / PARADO + placar (os números seguem visíveis) */}
        <div
          className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${
            paused ? "bg-amber-50" : "bg-red-50"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {paused ? (
              <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            ) : (
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <p className={`truncate text-xs font-semibold ${paused ? "text-amber-700" : "text-red-700"}`}>
              {paused ? (ended ? "ENCERRADO" : "PARADO") : "AO VIVO"} · {watched.deviceLabel} · {watched.teamAName}{" "}
              {snap.currentSet?.teamAScore ?? 0} × {snap.currentSet?.teamBScore ?? 0} {watched.teamBName} · Set{" "}
              {watched.setNum}
            </p>
          </div>
          <Button
            onClick={() => {
              setWatchingId(null)
              setEnded(false)
            }}
            size="sm"
            variant="outline"
            className={`shrink-0 gap-1.5 ${
              paused ? "border-amber-300 text-amber-700 hover:bg-amber-100" : "border-red-300 text-red-700 hover:bg-red-100"
            }`}
          >
            <X className="size-3.5" />
            Sair
          </Button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.value
                  ? "bg-orange-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-4">
          {tab === "stats" && (
            <ModernStatsDashboard
              stats={stats}
              teamAName={watched.teamAName}
              teamBName={watched.teamBName}
              actions={actions}
              sets={sets}
            />
          )}
          {tab === "spreadsheet" && (
            <PlayerStatsSpreadsheet actions={actions} teamAName={watched.teamAName} teamBName={watched.teamBName} />
          )}
          {tab === "charts" && (
            <AdvancedAnalyticsCharts
              actions={actions}
              sets={sets}
              teamAName={watched.teamAName}
              teamBName={watched.teamBName}
            />
          )}
          {tab === "transitions" && (
            <TransitionsDashboard actions={actions} teamAName={watched.teamAName} teamBName={watched.teamBName} />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        aria-label="Acompanhar coletas ao vivo da conta"
        className="relative flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <Radio className="h-4 w-4" />
        Ao vivo
        {sessions.length > 0 && (
          <span className="ml-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {sessions.length}
          </span>
        )}
      </button>

      {listOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Coletas ao vivo"
          onClick={() => setListOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2">
              <Radio className="size-4 text-red-500" />
              <h3 className="text-base font-semibold text-foreground">Coletas ao vivo</h3>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Acompanhe em tempo real a coleta feita em outro aparelho logado na sua conta.
            </p>
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma coleta ao vivo no momento. Quando outro aparelho da sua conta começar a registrar,
                aparecerá aqui automaticamente.
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {sessions.map((s) => (
                  <li key={s.deviceId}>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingId(s.deviceId)
                        setWatched(s)
                        setEnded(false)
                        setTab("stats")
                        setListOpen(false)
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border bg-background px-3 py-3 text-left transition hover:border-red-300 hover:bg-red-50/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {s.teamAName} {s.snapshot.currentSet?.teamAScore ?? 0} ×{" "}
                          {s.snapshot.currentSet?.teamBScore ?? 0} {s.teamBName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.deviceLabel} · Set {s.setNum} · {s.snapshot.actions?.length ?? 0} ações
                          {s.stale && <span className="font-semibold text-amber-600"> · parado</span>}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                        Assistir
                        <ArrowRight className="size-3.5" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setListOpen(false)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
