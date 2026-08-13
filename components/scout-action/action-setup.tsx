"use client"

import { useState } from "react"
import { Plus, Trash2, Play, ArrowLeft } from "lucide-react"
import { ACTION_ROLES, type ActionPlayer, type ActionRole } from "@/lib/scout-action/types"

export interface ActionMatchConfig {
  teamName: string
  opponentName: string
  category: string
  players: ActionPlayer[]
  firstServer: "us" | "them"
}

interface RosterRow {
  number: string
  name: string
  role: ActionRole
}

export function ActionSetup({
  onStart,
  onBack,
}: {
  onStart: (config: ActionMatchConfig) => void
  onBack: () => void
}) {
  const [teamName, setTeamName] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [category, setCategory] = useState("")
  const [firstServer, setFirstServer] = useState<"us" | "them">("us")
  const [rows, setRows] = useState<RosterRow[]>([
    { number: "", name: "", role: "Levantadora" },
    { number: "", name: "", role: "Central" },
    { number: "", name: "", role: "Ponteira" },
  ])

  function updateRow(i: number, patch: Partial<RosterRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { number: "", name: "", role: "Ponteira" }])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  const validPlayers: ActionPlayer[] = rows
    .filter((r) => r.number.trim() && r.name.trim())
    .map((r) => ({ number: Number(r.number), name: r.name.trim(), role: r.role }))

  const numbers = validPlayers.map((p) => p.number)
  const hasDuplicate = new Set(numbers).size !== numbers.length
  const canStart = teamName.trim().length > 0 && validPlayers.length >= 2 && !hasDuplicate

  function handleStart() {
    if (!canStart) return
    onStart({
      teamName: teamName.trim(),
      opponentName: opponentName.trim() || "Adversário",
      category: category.trim(),
      players: validPlayers,
      firstServer,
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <h1 className="mb-1 text-2xl font-bold text-white">Nova coleta</h1>
      <p className="mb-6 text-sm text-slate-400">
        Configure o time que será acompanhado. O adversário entra apenas como placar.
      </p>

      {/* Times */}
      <div className="mb-5 space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Meu time</span>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ex.: Vôlei Sub-17"
              className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Adversário</span>
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Adversário"
              className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Categoria</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Sub-17 Feminino"
              className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Primeiro saque</span>
            <div className="flex h-10 gap-2">
              <button
                type="button"
                onClick={() => setFirstServer("us")}
                className={`flex-1 rounded-lg border text-sm font-medium ${
                  firstServer === "us"
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-600 bg-slate-900 text-slate-400"
                }`}
              >
                Nós
              </button>
              <button
                type="button"
                onClick={() => setFirstServer("them")}
                className={`flex-1 rounded-lg border text-sm font-medium ${
                  firstServer === "them"
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-600 bg-slate-900 text-slate-400"
                }`}
              >
                Adversário
              </button>
            </div>
          </label>
        </div>
      </div>

      {/* Elenco */}
      <div className="mb-5 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Elenco</h2>
          <span className="text-xs text-slate-400">{validPlayers.length} atleta(s)</span>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.number}
                onChange={(e) => updateRow(i, { number: e.target.value.replace(/\D/g, "") })}
                placeholder="Nº"
                inputMode="numeric"
                className="h-10 w-14 shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-2 text-center text-sm text-white placeholder:text-slate-500"
              />
              <input
                value={r.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Nome da atleta"
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
              />
              <select
                value={r.role}
                onChange={(e) => updateRow(i, { role: e.target.value as ActionRole })}
                className="h-10 shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-1 text-xs text-white"
              >
                {ACTION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeRow(i)}
                className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:text-red-400"
                aria-label="Remover atleta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Adicionar atleta
        </button>

        {hasDuplicate && (
          <p className="mt-2 text-xs text-red-400">Há números de camisa repetidos.</p>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-base font-bold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play className="h-5 w-5" />
        Iniciar coleta
      </button>
      {!canStart && (
        <p className="mt-2 text-center text-xs text-slate-500">
          Informe o nome do time e ao menos duas atletas (número + nome).
        </p>
      )}
    </div>
  )
}
