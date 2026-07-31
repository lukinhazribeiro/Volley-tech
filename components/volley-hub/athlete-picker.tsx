"use client"

import useSWR from "swr"
import { User } from "lucide-react"
import type { HubAthlete } from "@/lib/hub/types"
import { listAthletes } from "@/lib/hub/data"

export function AthletePicker({
  value,
  onChange,
  athletes: athletesProp,
}: {
  value?: string
  onChange: (id: string) => void
  /** Opcional: se não fornecido, o picker busca as atletas sozinho. */
  athletes?: HubAthlete[]
}) {
  const { data } = useSWR(athletesProp ? null : "hub-athletes-picker", listAthletes)
  const athletes = athletesProp ?? data ?? []

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 shrink-0 text-[var(--hub-accent)]" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[220px] flex-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
      >
        <option value="">Selecione uma atleta…</option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
            {a.team ? ` — ${a.team}` : ""}
          </option>
        ))}
      </select>
    </div>
  )
}
