"use client"

import { useState } from "react"
import { Trash2, X } from "lucide-react"
import {
  DETALHE_OPCOES,
  FUNDAMENTO_LABEL,
  FUNDAMENTO_ORDER,
  RESULTADO_LABEL,
  formatTime,
  type Fundamento,
  type Player,
  type Resultado,
  type ScoutAction,
} from "@/lib/video-scout/types"

const RESULTADOS: Resultado[] = ["ponto", "erro", "continuidade"]

interface ActionEditorProps {
  action: ScoutAction
  players: Player[]
  onSave: (updated: ScoutAction) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ActionEditor({
  action,
  players,
  onSave,
  onDelete,
  onClose,
}: ActionEditorProps) {
  const [fundamento, setFundamento] = useState<Fundamento>(action.fundamento)
  const [resultado, setResultado] = useState<Resultado>(action.resultado)
  const [playerId, setPlayerId] = useState<string | null>(action.playerId)
  const [detalhe, setDetalhe] = useState<string | null>(action.detalhe ?? null)

  const opcoesDetalhe = DETALHE_OPCOES[fundamento]

  function handleSave() {
    onSave({
      ...action,
      fundamento,
      resultado,
      playerId,
      detalhe: opcoesDetalhe ? detalhe : null,
      validated: true,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Editar ação"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Editar ação</h3>
            <p className="text-xs text-slate-400">
              Momento {formatTime(action.timestamp)} no vídeo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Fundamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FUNDAMENTO_ORDER.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFundamento(f)
                    setDetalhe(null)
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    fundamento === f
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {FUNDAMENTO_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Resultado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResultado(r)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    resultado === r
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {RESULTADO_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {opcoesDetalhe && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                {fundamento === "levantamento"
                  ? "Para onde foi (alvo)"
                  : fundamento === "bloqueio"
                    ? "Posição do bloqueio"
                    : "Tipo de defesa"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {opcoesDetalhe.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDetalhe(o.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      detalhe === o.value
                        ? "border-blue-500 bg-blue-500/15 text-blue-200"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="player-select"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Atleta
            </label>
            <select
              id="player-select"
              value={playerId ?? ""}
              onChange={(e) => setPlayerId(e.target.value || null)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="">Sem atleta definido</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} - {p.name} ({p.team === "casa" ? "Casa" : "Adversário"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(action.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Excluir
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
