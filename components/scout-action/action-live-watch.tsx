"use client"

// Espectador ao vivo do Scout Action.
//
// Botão "Ao vivo" (com contador) que aparece na coleta. Ao tocar, lista as
// coletas em andamento em OUTROS aparelhos logados na mesma conta e permite
// acompanhar a planilha em tempo real (somente leitura) — pensado para o
// técnico ver os números enquanto o analista coleta em outro aparelho.

import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Radio, X } from "lucide-react"
import {
  loadActionLiveSessions,
  subscribeToActionLive,
  type ActionLiveSession,
} from "@/lib/scout-action/live-session"
import type { LiveState } from "@/lib/scout-action/live"
import type { TeamConfig } from "@/lib/video-scout/match"
import { ActionSpreadsheet } from "./action-spreadsheet"

// Reconstrói o estado necessário para a planilha a partir do snapshot ao vivo.
function toLiveState(session: ActionLiveSession): LiveState {
  const m = session.match
  return {
    teamA: { ...m.teamA, side: "casa" } as TeamConfig,
    teamB: { ...m.teamB, side: "adversario" } as TeamConfig,
    scoreA: session.scoreA,
    scoreB: session.scoreB,
    setIndex: m.setScores?.length ?? 0,
    servingTeam: null,
    events: m.events,
    setScores: m.setScores ?? [],
  }
}

export function ActionLiveWatch() {
  const [sessions, setSessions] = useState<ActionLiveSession[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [watchingId, setWatchingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const refresh = () => {
      loadActionLiveSessions().then((s) => {
        if (active) setSessions(s)
      })
    }
    refresh()
    const unsub = subscribeToActionLive(refresh)
    const interval = window.setInterval(refresh, 12_000)
    return () => {
      active = false
      unsub()
      window.clearInterval(interval)
    }
  }, [])

  const watched = watchingId ? sessions.find((s) => s.deviceId === watchingId) ?? null : null

  // Tela de acompanhamento (planilha ao vivo, somente leitura).
  if (watchingId) {
    if (!watched) {
      return (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-300">
          <Radio className="size-10 text-slate-600" aria-hidden />
          <p className="max-w-sm text-balance text-sm">
            A transmissão foi encerrada ou o outro aparelho ficou sem conexão.
          </p>
          <button
            type="button"
            onClick={() => setWatchingId(null)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
          >
            Voltar
          </button>
        </div>
      )
    }
    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-950/60 px-4 py-2.5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            </span>
            <p className="truncate text-xs font-semibold text-red-200">
              AO VIVO · {watched.deviceLabel} · {watched.teamAName} {watched.scoreA} × {watched.scoreB}{" "}
              {watched.teamBName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWatchingId(null)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
          >
            <X className="size-3.5" />
            Sair
          </button>
        </div>
        <ActionSpreadsheet
          live={toLiveState(watched)}
          category={watched.match.category}
          competition={watched.match.competition}
          onBack={() => setWatchingId(null)}
        />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setListOpen(true)}
        aria-label="Acompanhar coletas ao vivo da conta"
        className="relative inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <Radio className="size-4" />
        {sessions.length > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {sessions.length}
          </span>
        )}
      </button>

      {listOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Coletas ao vivo"
          onClick={() => setListOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2">
              <Radio className="size-4 text-red-400" />
              <h3 className="text-base font-semibold text-white">Coletas ao vivo</h3>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Acompanhe em tempo real a coleta feita em outro aparelho logado na sua conta.
            </p>
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
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
                        setListOpen(false)
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-left transition hover:border-red-400/50 hover:bg-red-500/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {s.teamAName} {s.scoreA} × {s.scoreB} {s.teamBName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {s.deviceLabel} · Set {s.setNum} · {s.match.events?.length ?? 0} lances
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
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
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
