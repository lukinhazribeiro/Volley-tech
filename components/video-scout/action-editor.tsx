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

  const optionClass = (active: boolean) =>
    `rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
      active
        ? "border-orange-400 bg-orange-50 text-orange-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Editar ação"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Editar ação</h3>
            <p className="text-xs text-slate-500">
              Momento {formatTime(action.timestamp)} no vídeo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
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
                  className={optionClass(fundamento === f)}
                >
                  {FUNDAMENTO_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Resultado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResultado(r)}
                  className={optionClass(resultado === r)}
                >
                  {RESULTADO_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {opcoesDetalhe && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
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
                    className={optionClass(detalhe === o.value)}
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
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Atleta
            </label>
            <select
              id="player-select"
              value={playerId ?? ""}
              onChange={(e) => setPlayerId(e.target.value || null)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Excluir
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
