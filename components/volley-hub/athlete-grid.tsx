"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { User, Search } from "lucide-react"
import { listAthletes } from "@/lib/hub/data"
import { EmptyState } from "./ui"

/**
 * Grade de atletas para o IPTV Atleta: mostra todas as atletas registradas em
 * cards, com filtro por categoria e busca por nome. Ao clicar numa atleta,
 * chama `onSelect` com o id — o detalhe é renderizado pelo componente pai.
 */
export function AthleteGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isLoading } = useSWR("hub-athletes-picker", listAthletes)
  const athletes = data ?? []
  const [category, setCategory] = useState<string>("all")
  const [query, setQuery] = useState("")

  // Categorias distintas presentes nas atletas (ordenadas).
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const a of athletes) if (a.category?.trim()) set.add(a.category.trim())
    return Array.from(set).sort((x, y) => x.localeCompare(y, "pt-BR"))
  }, [athletes])

  const filtered = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    return athletes.filter((a) => {
      if (category !== "all" && (a.category?.trim() ?? "") !== category) return false
      if (!q) return true
      const name = a.full_name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
      return name.includes(q)
    })
  }, [athletes, category, query])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando atletas...</p>
  }

  if (athletes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma atleta registrada"
        description="Importe scouts no Volley Hub para que as atletas apareçam aqui."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros: busca + categoria */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atleta pelo nome…"
            className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] py-2 pl-9 pr-3 text-sm text-[var(--hub-text)]"
            aria-label="Buscar atleta pelo nome"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoria">
            <CategoryChip label="Todas" active={category === "all"} onClick={() => setCategory("all")} />
            {categories.map((c) => (
              <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        )}
      </div>

      {/* Grade de cards */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atleta encontrada com esses filtros.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface)] p-4 text-left transition-colors hover:border-[var(--hub-accent)] hover:bg-[var(--hub-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--hub-accent)]/10 text-[var(--hub-accent)]">
                  <User className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--hub-text)]">{a.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[a.position, a.category, a.team].filter(Boolean).join(" • ") || "Sem dados"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
      className={
        active
          ? "rounded-full bg-[var(--hub-accent)] px-3 py-1 text-xs font-medium text-[var(--hub-accent-foreground,white)]"
          : "rounded-full border border-[var(--hub-border)] px-3 py-1 text-xs font-medium text-[var(--hub-text)] hover:border-[var(--hub-accent)]"
      }
    >
      {label}
    </button>
  )
}
