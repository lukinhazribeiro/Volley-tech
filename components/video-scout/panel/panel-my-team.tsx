"use client"

import { useState } from "react"
import { ArrowLeftRight, Hand, Send, Shield, Swords, X, MoveUp, Ban } from "lucide-react"
import { type Fundamento, type Posicao, type Qualidade } from "@/lib/video-scout/types"
import { findPlayer, onCourtPlayerId, type TeamConfig } from "@/lib/video-scout/match"
import type { RecordPayload } from "./panel-team"

/** Próximo fundamento sugerido após registrar uma ação (fluxo natural do rally). */
const NEXT_HINT: Partial<Record<Fundamento, string>> = {
  saque: "PASSE",
  recepcao: "ATAQUE",
  defesa: "ATAQUE",
  levantamento: "ATAQUE",
}

const FRONT: Posicao[] = ["P4", "P3", "P2"]
const BACK: Posicao[] = ["P5", "P6", "P1"]

// Fundamentos da minha equipe (com ícones), no estilo do mockup.
const FUND_BUTTONS: {
  fundamento: Fundamento
  label: string
  short: string
  icon: typeof Send
  color: string
}[] = [
  { fundamento: "saque", label: "SAQUE", short: "S", icon: Send, color: "text-orange-500" },
  { fundamento: "recepcao", label: "PASSE", short: "P", icon: Hand, color: "text-blue-500" },
  { fundamento: "ataque", label: "ATAQUE", short: "A", icon: Swords, color: "text-red-500" },
  { fundamento: "bloqueio", label: "BLOQUEIO", short: "B", icon: Ban, color: "text-indigo-500" },
  { fundamento: "defesa", label: "DEFESA", short: "D", icon: Shield, color: "text-teal-500" },
  { fundamento: "levantamento", label: "LEVANT.", short: "L", icon: MoveUp, color: "text-cyan-500" },
]

const PONTO_FUNDS: { fundamento: Fundamento; label: string }[] = [
  { fundamento: "ataque", label: "Ataque" },
  { fundamento: "bloqueio", label: "Bloqueio" },
  { fundamento: "saque", label: "Saque (ace)" },
]
const ERRO_FUNDS: { fundamento: Fundamento; label: string }[] = [
  { fundamento: "saque", label: "Saque" },
  { fundamento: "recepcao", label: "Recepção" },
  { fundamento: "levantamento", label: "Levantamento" },
  { fundamento: "ataque", label: "Ataque" },
  { fundamento: "bloqueio", label: "Bloqueio" },
  { fundamento: "defesa", label: "Defesa" },
]

type Pending = { quality: Qualidade } | null

interface PanelMyTeamProps {
  team: TeamConfig
  isServing: boolean
  onRecord: (payload: RecordPayload) => void
  onAmend: (quality: "ponto" | "erro") => void
  canAmend: boolean
  onSubstitute: (posicao: Posicao) => void
}

export function PanelMyTeam({
  team,
  isServing,
  onRecord,
  onAmend,
  canAmend,
  onSubstitute,
}: PanelMyTeamProps) {
  const [activePos, setActivePos] = useState<Posicao>("P1")
  const [pending, setPending] = useState<Pending>(null)
  const [hint, setHint] = useState<string | null>(null)

  function numberAt(pos: Posicao): string {
    const id = onCourtPlayerId(team, pos, isServing)
    const p = findPlayer(team, id)
    return p ? String(p.number) : "-"
  }
  function isLiberoAt(pos: Posicao): boolean {
    return onCourtPlayerId(team, pos, isServing) === team.liberoId
  }

  function registerPositive(f: Fundamento) {
    if (f === "levantamento") {
      onRecord({ posicao: team.setterPosicao, fundamento: "levantamento", qualidade: "positivo" })
      setPending(null)
      setHint("ATAQUE")
      return
    }
    onRecord({ posicao: activePos, fundamento: f, qualidade: "positivo" })
    setPending(null)
    setHint(NEXT_HINT[f] ?? null)
  }

  function handlePonto() {
    if (canAmend) {
      onAmend("ponto")
      setHint(null)
    } else {
      setPending({ quality: "ponto" })
    }
  }
  function handleErro() {
    if (canAmend) {
      onAmend("erro")
      setHint(null)
    } else {
      setPending({ quality: "erro" })
    }
  }

  function complete(payload: RecordPayload) {
    onRecord(payload)
    setPending(null)
    setHint(null)
  }

  function previewPlayer(): string {
    const id = onCourtPlayerId(team, activePos, isServing)
    const p = findPlayer(team, id)
    if (!p) return "—"
    const isLibero = id === team.liberoId
    const role = p.role && p.role !== "libero" ? ` · ${p.role}` : ""
    return `#${p.number}${isLibero ? " (Líbero)" : role}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1: leitura detalhada — grade de posições + PONTO */}
      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            {team.name} <span className="text-sm font-medium text-slate-400">(Leitura Detalhada)</span>
          </h2>
          <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Minha equipe
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[...FRONT, ...BACK].map((pos) => {
            const active = activePos === pos
            const libero = isLiberoAt(pos)
            return (
              <button
                key={pos}
                type="button"
                onClick={() => setActivePos(pos)}
                className={`flex touch-manipulation select-none flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all active:scale-95 ${
                  active
                    ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span
                  className={`relative flex size-11 items-center justify-center rounded-full text-xl font-extrabold text-white ${
                    libero ? "bg-amber-500" : "bg-blue-600"
                  }`}
                >
                  {numberAt(pos)}
                  {libero && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-amber-600 px-1 text-[9px] font-bold text-white">
                      L
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold text-slate-700">{pos}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handlePonto}
          className="mt-4 flex min-h-14 w-full touch-manipulation select-none items-center justify-center rounded-xl bg-emerald-600 text-lg font-extrabold tracking-wide text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98]"
        >
          PONTO
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          Posição ativa: <span className="font-semibold text-blue-600">{activePos}</span> · atleta{" "}
          {previewPlayer()}
        </p>

        <button
          type="button"
          onClick={() => onSubstitute(activePos)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Substituir posição {activePos}
        </button>
      </section>

      {/* Card 2: ações da minha equipe (fundamentos) */}
      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
          Ação da minha equipe
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {FUND_BUTTONS.map((b) => {
            const Icon = b.icon
            return (
              <button
                key={b.fundamento}
                type="button"
                onClick={() => registerPositive(b.fundamento)}
                className="flex min-h-20 touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-3 transition-all hover:bg-slate-100 active:scale-95"
              >
                <Icon className={`size-6 ${b.color}`} aria-hidden="true" />
                <span className={`text-lg font-extrabold leading-none ${b.color}`}>{b.short}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {b.label}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleErro}
          className="mt-3 flex min-h-12 w-full touch-manipulation select-none items-center justify-center rounded-xl bg-red-500 text-base font-extrabold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-red-400 active:scale-[0.98]"
        >
          Erro da minha equipe
        </button>

        {hint && (
          <p className="mt-3 rounded-md border border-orange-100 bg-orange-50 px-3 py-1.5 text-center text-xs text-slate-600">
            Registrado positivo. Próximo sugerido:{" "}
            <span className="font-bold text-blue-600">{hint}</span>{" "}
            <span className="text-slate-400">— ou toque PONTO/ERRO para corrigir</span>
          </p>
        )}

        {/* Overlay: escolher o fundamento do ponto/erro */}
        {pending && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-slate-50 p-3">
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
            <div className="grid grid-cols-2 gap-2">
              {(pending.quality === "ponto" ? PONTO_FUNDS : ERRO_FUNDS).map((f) => (
                <button
                  key={f.fundamento}
                  type="button"
                  onClick={() =>
                    complete({ posicao: activePos, fundamento: f.fundamento, qualidade: pending.quality })
                  }
                  className="min-h-12 touch-manipulation select-none rounded-lg border border-slate-200 bg-white px-2 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
