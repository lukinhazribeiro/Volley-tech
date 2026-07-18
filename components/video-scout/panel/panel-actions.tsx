"use client"

import { Trash2, Undo2 } from "lucide-react"
import {
  DETALHE_OPCOES,
  FUNDAMENTO_LABEL,
  QUALIDADE_LABEL,
  QUALIDADE_STYLE,
  formatTime,
  type ScoutAction,
} from "@/lib/video-scout/types"

/** Rótulo legível do detalhe da ação (ex.: "Bola de Segunda", tipo de defesa). */
function detalheLabel(a: ScoutAction): string | null {
  if (!a.detalhe) return null
  return DETALHE_OPCOES[a.fundamento]?.find((o) => o.value === a.detalhe)?.label ?? a.detalhe
}

interface PanelActionsProps {
  actions: ScoutAction[]
  onDelete: (id: string) => void
  onUndo: () => void
}

export function PanelActions({ actions, onDelete, onUndo }: PanelActionsProps) {
  const recent = [...actions].slice(-40).reverse()

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-orange-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-orange-100 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-orange-600">Ações</h3>
        <button
          type="button"
          onClick={onUndo}
          disabled={actions.length === 0}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          Desfazer
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            Nenhuma ação registrada. Use os botões de fundamento de cada equipe para começar.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((a) => {
              const isA = a.team === "casa"
              const q = a.qualidade ?? (a.resultado === "ponto" ? "ponto" : a.resultado === "erro" ? "erro" : "positivo")
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"
                >
                  <span
                    className={`h-4 w-1 shrink-0 rounded-full ${isA ? "bg-blue-500" : "bg-pink-500"}`}
                  />
                  <span className="w-12 shrink-0 font-mono text-xs text-slate-400">
                    {formatTime(a.timestamp)}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                      isA ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {isA ? "A" : "B"}
                  </span>
                  <span className="w-8 shrink-0 text-xs font-semibold text-slate-500">
                    {a.posicao ?? "-"}
                  </span>
                  <span className="flex flex-1 items-center gap-1.5 truncate font-medium text-slate-700">
                    {FUNDAMENTO_LABEL[a.fundamento]}
                    {detalheLabel(a) && (
                      <span className="rounded border border-slate-200 bg-slate-100 px-1 text-[10px] text-slate-600">
                        {detalheLabel(a)}
                      </span>
                    )}
                    {a.auto && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                        auto
                      </span>
                    )}
                    {a.fundamento === "bloqueio" && a.toque && (
                      <span className="rounded border border-indigo-200 bg-indigo-50 px-1 text-[10px] font-bold text-indigo-700">
                        toque +
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold uppercase ${
                      a.fundamento === "bloqueio" && a.toque ? "text-indigo-600" : QUALIDADE_STYLE[q]
                    }`}
                  >
                    {a.fundamento === "bloqueio" && a.toque ? "Bloqueio +" : QUALIDADE_LABEL[q]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="shrink-0 text-slate-400 hover:text-red-500"
                    aria-label="Remover ação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
