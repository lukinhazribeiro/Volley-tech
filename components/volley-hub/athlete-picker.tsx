"use client"

import { User } from "lucide-react"
import type { HubAthlete } from "@/lib/hub/types"

export function AthletePicker({
  athletes,
  value,
  onChange,
}: {
  athletes: HubAthlete[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-[var(--hub-accent)]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[220px] rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
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
