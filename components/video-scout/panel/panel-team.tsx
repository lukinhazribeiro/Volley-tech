"use client"

import { useState } from "react"
import { ArrowLeftRight, Shield, X } from "lucide-react"
import {
  type Fundamento,
  type Posicao,
  type Qualidade,
} from "@/lib/video-scout/types"
import {
  effectiveFormation,
  findPlayer,
  onCourtPlayerId,
  type TeamConfig,
} from "@/lib/video-scout/match"

export interface RecordPayload {
  posicao: Posicao
  fundamento: Fundamento
  qualidade: Qualidade
  detalhe?: string | null
}

/** Próximo fundamento sugerido após registrar uma ação (fluxo natural do rally). */
const NEXT_HINT: Partial<Record<Fundamento, string>> = {
  saque: "PASSE",
  recepcao: "ATAQUE",
  defesa: "ATAQUE",
  levantamento: "ATAQUE",
}

const FUND_BUTTONS: {
  fundamento: Fundamento | "erro"
  label: string
  className: string
}[] = [
  { fundamento: "saque", label: "SAQUE", className: "bg-blue-600 hover:bg-blue-500" },
  { fundamento: "recepcao", label: "PASSE", className: "bg-orange-500 hover:bg-orange-400" },
  { fundamento: "ataque", label: "ATAQUE", className: "bg-red-600 hover:bg-red-500" },
  { fundamento: "bloqueio", label: "BLOCK", className: "bg-amber-500 hover:bg-amber-400 text-slate-900" },
  { fundamento: "defesa", label: "DEFESA", className: "bg-teal-600 hover:bg-teal-500" },
  { fundamento: "erro", label: "ERRO", className: "bg-slate-500 hover:bg-slate-400" },
]

const FRONT: Posicao[] = ["P4", "P3", "P2"]
const BACK: Posicao[] = ["P5", "P6", "P1"]
const PONTO_FUNDS: { fundamento: Fundamento; label: string }[] = [
  { fundamento: "ataque", label: "Ataque" },
  { fundamento: "bloqueio", label: "Bloqueio" },
  { fundamento: "saque", label: "Saque (ace)" },
]
const ERRO_FUNDS: { fundamento: Fundamento; label: string }[] = [
  { fundamento: "saque", label: "Saque" },
  { fundamento: "recepcao", label: "Recepção" },
  { fundamento: "ataque", label: "Ataque" },
  { fundamento: "bloqueio", label: "Bloqueio" },
  { fundamento: "defesa", label: "Defesa" },
]

type Pending = { kind: "fundamento"; quality: Qualidade } | null

interface PanelTeamProps {
  team: TeamConfig
  accent: "blue" | "pink"
  onRecord: (payload: RecordPayload) => void
  /** Converte a última ação positiva da equipe em ponto/erro. */
  onAmend: (quality: "ponto" | "erro") => void
  /** Se há uma ação recente desta equipe que pode virar ponto/erro. */
  canAmend: boolean
  onSubstitute: (posicao: Posicao) => void
  onOpenLibero: () => void
}

export function PanelTeam({
  team,
  accent,
  onRecord,
  onAmend,
  canAmend,
  onSubstitute,
  onOpenLibero,
}: PanelTeamProps) {
  const [activePos, setActivePos] = useState<Posicao>("P1")
  const [pending, setPending] = useState<Pending>(null)
  const [hint, setHint] = useState<string | null>(null)

  const accentText = accent === "blue" ? "text-blue-600" : "text-pink-600"
  const accentBar = accent === "blue" ? "bg-blue-500" : "bg-pink-500"
  const accentBorder = accent === "blue" ? "border-blue-200" : "border-pink-200"

  // Formação efetiva: aplica a troca automática do líbero no fundo.
  const eff = effectiveFormation(team)

  function numberAt(pos: Posicao): string {
    const p = findPlayer(team, eff[pos].playerId)
    return p ? String(p.number) : "-"
  }

  function isLiberoAt(pos: Posicao): boolean {
    return eff[pos].isLibero
  }

  function handleFundClick(f: Fundamento | "erro") {
    if (f === "erro") {
      if (canAmend) {
        onAmend("erro")
        setHint(null)
      } else {
        setPending({ kind: "fundamento", quality: "erro" })
      }
    } else {
      registerPositive(f)
    }
  }

  /** Registra a ação como positiva e sugere o próximo fundamento do rally. */
  function registerPositive(f: Fundamento, detalhe?: string | null) {
    onRecord({ posicao: activePos, fundamento: f, qualidade: "positivo", detalhe })
    setPending(null)
    setHint(NEXT_HINT[f] ?? null)
  }

  /** PONTO: vira a última ação em ponto; se não houver, pergunta o fundamento. */
  function handlePonto() {
    if (canAmend) {
      onAmend("ponto")
      setHint(null)
    } else {
      setPending({ kind: "fundamento", quality: "ponto" })
    }
  }

  function complete(payload: RecordPayload) {
    onRecord(payload)
    setPending(null)
    setHint(null)
  }

  // Qual atleta vai receber a ação (com líbero quando aplicável).
  function previewPlayer(): string {
    const id = onCourtPlayerId(team, activePos)
    const p = findPlayer(team, id)
    if (!p) return "—"
    const isLibero = id === team.liberoId
    const role = p.role && p.role !== "libero" ? ` · ${p.role}` : ""
    return `#${p.number}${isLibero ? " (Líbero)" : role}`
  }

  function PositionCircle({ pos, size }: { pos: Posicao; size: "lg" | "sm" }) {
    const big = size === "lg"
    return (
      <button
        type="button"
        onClick={() => (big ? onSubstitute(pos) : setActivePos(pos))}
        className="flex flex-col items-center gap-1"
        title={big ? "Clique para substituir" : "Selecionar posição da ação"}
      >
        <span
          className={`relative flex items-center justify-center rounded-full border-2 font-bold transition-all ${
            big ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm"
          } ${
            !big && activePos === pos
              ? `${accentBar} border-transparent text-white`
              : isLiberoAt(pos)
                ? "border-amber-400 bg-amber-50 text-amber-600"
                : `border-slate-300 bg-slate-50 ${accentText}`
          }`}
        >
          {numberAt(pos)}
          {isLiberoAt(pos) && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              L
            </span>
          )}
        </span>
        <span className="text-[11px] text-slate-500">
          {pos}
          {isLiberoAt(pos) && <span className="ml-1 text-amber-600">Líb</span>}
        </span>
      </button>
    )
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-5 w-1 rounded-full ${accentBar}`} />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${accentText}`}>
            {team.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenLibero}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Shield className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          Líbero
        </button>
      </div>

      {/* Quadra: rede em cima, fundo embaixo */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {FRONT.map((pos) => (
            <div key={pos} className="flex justify-center">
              <PositionCircle pos={pos} size="lg" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BACK.map((pos) => (
            <div key={pos} className="flex justify-center">
              <PositionCircle pos={pos} size="lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Formação: botões de fundamento */}
      <div>
        <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${accentText}`}>
          Formação
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {FUND_BUTTONS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => handleFundClick(b.fundamento)}
              className={`flex min-h-16 touch-manipulation select-none items-center justify-center rounded-xl px-2 py-4 text-base font-extrabold tracking-wide text-white shadow-sm transition-all active:scale-95 active:shadow-none ${b.className}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de posição da ação + PONTO */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePonto}
          className="flex h-full min-h-20 flex-1 touch-manipulation select-none items-center justify-center rounded-xl bg-emerald-600 px-4 text-lg font-extrabold tracking-wide text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 active:shadow-none"
        >
          PONTO
        </button>
        <div className="grid grid-cols-3 gap-2">
          {[...FRONT, ...BACK].map((pos) => (
            <PositionCircle key={pos} pos={pos} size="sm" />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Posição ativa: <span className={accentText}>{activePos}</span> · atleta{" "}
        {previewPlayer()}
      </p>

      {hint && (
        <p className="rounded-md border border-orange-100 bg-orange-50 px-3 py-1.5 text-center text-xs text-slate-600">
          Registrado positivo. Próximo sugerido:{" "}
          <span className={`font-bold ${accentText}`}>{hint}</span>{" "}
          <span className="text-slate-400">— ou toque PONTO/ERRO para corrigir</span>
        </p>
      )}

      {/* Overlay de escolha */}
      {pending && (
        <div className={`rounded-lg border ${accentBorder} bg-slate-50 p-3`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {pending.quality === "ponto" ? "Ponto de" : "Erro de"}
            </span>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pending.kind === "fundamento" && (
            <div className="grid grid-cols-2 gap-2">
              {(pending.quality === "ponto" ? PONTO_FUNDS : ERRO_FUNDS).map((f) => (
                <button
                  key={f.fundamento}
                  type="button"
                  onClick={() =>
                    complete({
                      posicao: activePos,
                      fundamento: f.fundamento,
                      qualidade: pending.quality,
                    })
                  }
                  className="min-h-12 touch-manipulation select-none rounded-lg border border-slate-200 bg-white px-2 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95 active:shadow-none"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onSubstitute(activePos)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
        Substituir posição {activePos}
      </button>
    </section>
  )
}
