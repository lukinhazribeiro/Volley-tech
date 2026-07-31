"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { HubCard, EmptyState, IptvBadge } from "./ui"
import { listAthletes, listEntriesForAthlete, getAthlete } from "@/lib/hub/data"
import { aggregateFundamentals } from "@/lib/hub/stats"
import { computeIPTV } from "@/lib/hub/intelligence"
import { exportAthletePdf } from "@/lib/hub/export-pdf"
import { buildVHA, downloadVHA } from "@/lib/hub/vha"
import { Button } from "@/components/ui/button"
import { FileDown, Archive, User, BarChart3 } from "lucide-react"

export function HubReports() {
  const { data: athletes, isLoading } = useSWR("hub-athletes", listAthletes)
  const [busy, setBusy] = useState<string | null>(null)

  async function handlePdf(id: string) {
    setBusy(`pdf-${id}`)
    try {
      const [athlete, entries] = await Promise.all([getAthlete(id), listEntriesForAthlete(id)])
      if (athlete) await exportAthletePdf(athlete, entries)
    } finally {
      setBusy(null)
    }
  }

  async function handleVha(id: string) {
    setBusy(`vha-${id}`)
    try {
      const [athlete, entries] = await Promise.all([getAthlete(id), listEntriesForAthlete(id)])
      if (athlete) {
        const vha = buildVHA(athlete, entries)
        downloadVHA(athlete.full_name, vha)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <HubCard>
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 size-5 text-[var(--hub-accent)]" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--hub-text)]">Relatórios e Exportação</h2>
            <p className="mt-1 text-sm text-[var(--hub-muted)]">
              Gere um relatório PDF completo ou exporte o histórico esportivo portátil (.vha) de cada atleta. O arquivo
              .vha contém apenas dados esportivos — nunca informações financeiras ou administrativas.
            </p>
          </div>
        </div>
      </HubCard>

      {isLoading && <p className="text-sm text-[var(--hub-muted)]">Carregando atletas...</p>}

      {!isLoading && (athletes ?? []).length === 0 && (
        <EmptyState
          title="Nenhuma atleta ainda"
          description="Importe históricos do Scout Volleyball para gerar relatórios."
        />
      )}

      <div className="grid gap-3">
        {(athletes ?? []).map((a) => (
          <AthleteReportRow
            key={a.id}
            id={a.id}
            name={a.full_name}
            meta={[a.position, a.category, a.team].filter(Boolean).join(" · ")}
            busy={busy}
            onPdf={() => handlePdf(a.id)}
            onVha={() => handleVha(a.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AthleteReportRow({
  id,
  name,
  meta,
  busy,
  onPdf,
  onVha,
}: {
  id: string
  name: string
  meta: string
  busy: string | null
  onPdf: () => void
  onVha: () => void
}) {
  const { data: iptv } = useSWR(["report-iptv", id], async () => {
    const entries = await listEntriesForAthlete(id)
    if (entries.length === 0) return 0
    return computeIPTV(aggregateFundamentals(entries.map((e) => e.stats)))
  })

  return (
    <HubCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--hub-bg-deep)]">
            <User className="size-5 text-[var(--hub-accent)]" />
          </div>
          <div>
            <Link
              href={`/volley-hub/iptv-atleta?athlete=${id}`}
              className="font-medium text-[var(--hub-text)] hover:text-[var(--hub-accent)]"
            >
              {name}
            </Link>
            <p className="text-xs text-[var(--hub-muted)]">{meta || "Sem dados"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {typeof iptv === "number" && <IptvBadge value={iptv} label="IPTV" />}
          <Button onClick={onPdf} disabled={!!busy} size="sm" variant="outline" className="gap-1.5 bg-transparent">
            <FileDown className="size-4" />
            {busy === `pdf-${id}` ? "..." : "PDF"}
          </Button>
          <Button onClick={onVha} disabled={!!busy} size="sm" className="gap-1.5">
            <Archive className="size-4" />
            {busy === `vha-${id}` ? "..." : ".vha"}
          </Button>
        </div>
      </div>
    </HubCard>
  )
}
