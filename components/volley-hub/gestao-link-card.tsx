"use client"

import { useMemo, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { Link2, Link2Off, Sparkles } from "lucide-react"
import { HubCard } from "./ui"
import { Button } from "@/components/ui/button"
import type { HubAthlete } from "@/lib/hub/types"
import { linkAthleteToGestao, unlinkAthleteFromGestao } from "@/lib/hub/data"
import { listGestaoAthletes, type GestaoAthleteOption } from "@/app/volley-hub/actions/gestao-link"

/** Normaliza nomes para comparação (sem acento, minúsculas). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

/**
 * Card de vínculo Hub↔Gestão. Ao vincular pela primeira vez (por ID da Gestão),
 * o vínculo fica fixo. Além disso, sugere automaticamente a atleta da Gestão
 * cujo nome bate com a atleta da Hub. Vincular e desvincular são reversíveis.
 */
export function GestaoLinkCard({ athlete }: { athlete: HubAthlete }) {
  const { mutate } = useSWRConfig()
  const { data: gestaoAthletes } = useSWR("gestao-athletes-link", listGestaoAthletes)
  const [selected, setSelected] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const options = gestaoAthletes ?? []
  const linked = athlete.gestao_atleta_id != null
  const linkedAthlete = linked ? options.find((o) => o.id === athlete.gestao_atleta_id) : undefined

  // Sugestão por nome (e categoria quando disponível), destacada no topo.
  const suggestion = useMemo<GestaoAthleteOption | undefined>(() => {
    if (linked || options.length === 0) return undefined
    const byName = options.filter((o) => norm(o.nome) === norm(athlete.full_name))
    if (byName.length === 0) return undefined
    if (byName.length === 1) return byName[0]
    // Vários com o mesmo nome: prioriza a mesma categoria.
    return byName.find((o) => norm(o.categoria ?? "") === norm(athlete.category ?? "")) ?? byName[0]
  }, [options, athlete.full_name, athlete.category, linked])

  async function handleLink(gestaoId: number) {
    setBusy(true)
    setError("")
    try {
      await linkAthleteToGestao(athlete.id, gestaoId)
      await Promise.all([mutate(["iptv-atleta", athlete.id]), mutate("hub-athletes-picker")])
      setSelected("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao vincular.")
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlink() {
    setBusy(true)
    setError("")
    try {
      await unlinkAthleteFromGestao(athlete.id)
      await Promise.all([mutate(["iptv-atleta", athlete.id]), mutate("hub-athletes-picker")])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao desvincular.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <HubCard
      title="Vínculo com a Gestão"
      description="Liga esta atleta ao cadastro do módulo de Gestão. Uma vez vinculada, os relatórios trazem os dados cadastrais automaticamente."
    >
      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="size-4 text-[var(--hub-accent)]" />
            <span className="text-[var(--hub-text)]">
              Vinculada a{" "}
              <strong>{linkedAthlete ? linkedAthlete.nome : `atleta #${athlete.gestao_atleta_id}`}</strong>
              {linkedAthlete?.categoria ? ` — ${linkedAthlete.categoria}` : ""}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleUnlink} disabled={busy} className="gap-2">
            <Link2Off className="size-4" />
            Desvincular
          </Button>
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-[var(--hub-muted)]">
          Nenhuma atleta encontrada na Gestão. Cadastre atletas no módulo de Gestão para poder vinculá-las.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestion && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--hub-accent)]/40 bg-[var(--hub-accent)]/5 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-[var(--hub-text)]">
                <Sparkles className="size-4 text-[var(--hub-accent)]" />
                Sugestão: <strong>{suggestion.nome}</strong>
                {suggestion.categoria ? ` — ${suggestion.categoria}` : ""}
              </span>
              <Button size="sm" onClick={() => handleLink(suggestion.id)} disabled={busy} className="gap-2">
                <Link2 className="size-4" />
                Vincular
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-[var(--hub-muted)]" htmlFor="gestao-select">
                Escolher manualmente
              </label>
              <select
                id="gestao-select"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-sm text-[var(--hub-text)]"
              >
                <option value="">Selecione uma atleta da Gestão…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                    {o.categoria ? ` — ${o.categoria}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => selected && handleLink(Number(selected))}
              disabled={busy || !selected}
              className="gap-2"
            >
              <Link2 className="size-4" />
              Vincular
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </HubCard>
  )
}
