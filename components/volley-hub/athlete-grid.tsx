"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Search, User } from "lucide-react"
import type { HubAthlete } from "@/lib/hub/types"
import { listAthletes } from "@/lib/hub/data"
import { EmptyState } from "./ui"

/**
 * Grade de atletas registradas. Ao abrir o IPTV Atleta, mostra todas as atletas
 * em cards, com filtro por categoria e busca por nome. Clicar num card abre o
 * detalhe da atleta.
 */
export function AthleteGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isLoading } = useSWR("hub-athletes-picker", listAthletes)
  const athletes = data ?? []
  const [category, setCategory] = useState<string>("all")
  const [query, setQuery] = useState("")

  // Categorias distintas presentes nas atletas (para os chips de filtro).
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const a of athletes) if (a.category?.trim()) set.add(a.category.trim())
    return Array.from(set).sort((x, y) => x.localeCompare(y, "pt-BR"))
  }, [athletes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return athletes.filter((a) => {
      const matchCat = category === "all" || (a.category?.trim() || "") === category
      const matchQuery = !q || a.full_name.toLowerCase().includes(q) || (a.team?.toLowerCase().includes(q) ?? false)
      return matchCat && matchQuery
    })
  }, [athletes, category, query])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)]" />
        ))}
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma atleta registrada"
        description="Importe um scout no menu de importação para que as atletas apareçam aqui."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 sm:max-w-sm">
        <Search className="h-4 w-4 shrink-0 text-[var(--hub-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou equipe…"
          className="w-full bg-transparent text-sm text-[var(--hub-text)] outline-none placeholder:text-[var(--hub-muted)]"
        />
      </div>

      {/* Filtro por categoria */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          <CategoryChip label="Todas" active={category === "all"} onClick={() => setCategory("all")} />
          {categories.map((c) => (
            <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
      )}

      {/* Grade */}
      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma atleta encontrada" description="Ajuste a busca ou o filtro de categoria." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AthleteCard key={a.id} athlete={a} onClick={() => onSelect(a.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--hub-accent)] bg-[var(--hub-accent)] text-[var(--hub-accent-foreground,#fff)]"
          : "border-[var(--hub-border)] bg-[var(--hub-surface)] text-[var(--hub-muted)] hover:text-[var(--hub-text)]"
      }`}
    >
      {label}
    </button>
  )
}

function AthleteCard({ athlete, onClick }: { athlete: HubAthlete; onClick: () => void }) {
  const initials = athlete.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-4 text-left transition-colors hover:border-[var(--hub-accent)]"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--hub-bg-deep)] text-sm font-semibold text-[var(--hub-accent)]">
        {initials || <User className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[var(--hub-text)]">{athlete.full_name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--hub-muted)]">
          {athlete.team && <span className="truncate">{athlete.team}</span>}
          {athlete.category && (
            <span className="rounded-full bg-[var(--hub-bg-deep)] px-2 py-0.5">{athlete.category}</span>
          )}
          {athlete.position && <span className="truncate">{athlete.position}</span>}
        </span>
      </span>
    </button>
  )
}
