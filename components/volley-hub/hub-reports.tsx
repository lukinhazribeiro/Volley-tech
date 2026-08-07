"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { HubCard, EmptyState, IptvBadge } from "./ui"
import { listAthletes, listEntriesForAthlete, getAthlete } from "@/lib/hub/data"
import { listAssessments } from "@/lib/hub/physical"
import { computeIGD, igdLabel } from "@/lib/hub/igd"
import { getGestaoAthlete } from "@/app/volley-hub/actions/gestao-link"
import { exportAthletePdf } from "@/lib/hub/export-pdf"
import { buildVHA, downloadVHA } from "@/lib/hub/vha"
import type { HubAthlete } from "@/lib/hub/types"
import { Button } from "@/components/ui/button"
import { FileDown, Archive, User, BarChart3, Link2 } from "lucide-react"

export function HubReports() {
  const { data: athletes, isLoading } = useSWR("hub-athletes", listAthletes)
  const [busy, setBusy] = useState<string | null>(null)

  async function handlePdf(id: string) {
    setBusy(`pdf-${id}`)
    try {
      const [athlete, entries, assessments] = await Promise.all([
        getAthlete(id),
        listEntriesForAthlete(id),
        listAssessments(id),
      ])
      if (athlete) {
        const gestao = athlete.gestao_atleta_id != null ? await getGestaoAthlete(athlete.gestao_atleta_id) : null
        await exportAthletePdf(athlete, entries, { assessments, gestao })
      }
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
            athlete={a}
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
  athlete,
  busy,
  onPdf,
  onVha,
}: {
  athlete: HubAthlete
  busy: string | null
  onPdf: () => void
  onVha: () => void
}) {
  const id = athlete.id
  const meta = [athlete.position, athlete.category, athlete.team].filter(Boolean).join(" · ")

  // Índices consolidados: IPTV (média por posição), IPF (média física),
  // Último TGP e IGD (média das parcelas disponíveis).
  const { data: indices } = useSWR(["report-indices", id], async () => {
    const [entries, assessments] = await Promise.all([listEntriesForAthlete(id), listAssessments(id)])
    return computeIGD(entries, assessments)
  })

  // Dados cadastrais da Gestão, apenas quando a atleta está vinculada.
  const { data: gestao } = useSWR(
    athlete.gestao_atleta_id != null ? ["report-gestao", athlete.gestao_atleta_id] : null,
    () => getGestaoAthlete(athlete.gestao_atleta_id as number),
  )

  return (
    <HubCard>
      <div className="flex flex-col gap-4">
        {/* Cabeçalho: identificação + ações */}
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
                {athlete.full_name}
              </Link>
              <p className="text-xs text-[var(--hub-muted)]">{meta || "Sem dados"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {indices?.igd != null && <IptvBadge value={indices.igd} label="IGD" />}
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

        {/* Índices consolidados */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <IndexTile label="IPTV" value={indices?.iptv} suffix="" />
          <IndexTile label="IPF" value={indices?.ipf} suffix="" />
          <IndexTile label="Último TGP" value={indices?.tgp} suffix="%" />
          <IndexTile label="IGD" value={indices?.igd} suffix="" hint={igdLabel(indices?.igd ?? null)} />
        </div>

        {/* Dados cadastrais (Gestão) quando vinculada */}
        {gestao && (
          <div className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg-deep)]/40 px-3 py-2">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--hub-accent)]">
              <Link2 className="size-3.5" />
              Cadastro (Gestão)
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--hub-muted)]">
              <span>
                Nome: <span className="text-[var(--hub-text)]">{gestao.nome}</span>
              </span>
              {gestao.categoria && (
                <span>
                  Categoria: <span className="text-[var(--hub-text)]">{gestao.categoria}</span>
                </span>
              )}
              {gestao.turma && (
                <span>
                  Turma: <span className="text-[var(--hub-text)]">{gestao.turma}</span>
                </span>
              )}
              {gestao.dataNascimento && (
                <span>
                  Nascimento:{" "}
                  <span className="text-[var(--hub-text)]">
                    {new Date(gestao.dataNascimento).toLocaleDateString("pt-BR")}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </HubCard>
  )
}

function IndexTile({
  label,
  value,
  suffix,
  hint,
}: {
  label: string
  value: number | null | undefined
  suffix: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] px-3 py-2 text-center">
      <p className="text-xs text-[var(--hub-muted)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-[var(--hub-text)]">
        {value != null ? `${value}${suffix}` : "—"}
      </p>
      {hint && <p className="text-[10px] text-[var(--hub-muted)]">{hint}</p>}
    </div>
  )
}
