"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { competenciaLabel } from "@/lib/gestao/format"
import { ChevronDown, ChevronUp, Users2 } from "lucide-react"

type AtletaFreq = { atletaNome: string; total: number; presentes: number; percentual: number }
type TurmaFreq = {
  turmaId: number
  turmaNome: string
  total: number
  presentes: number
  faltas: number
  percentual: number
  atletas: AtletaFreq[]
  evolucao: { competencia: string; percentual: number }[]
}

function cor(p: number) {
  if (p >= 80) return "var(--success)"
  if (p >= 60) return "var(--warning)"
  return "var(--destructive)"
}

export function FrequenciaMensal({
  dados,
  competencia,
  competencias,
}: {
  dados: TurmaFreq[]
  competencia: string
  competencias: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [aberta, setAberta] = useState<number | null>(null)

  function mudarMes(comp: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("mes", comp)
    router.push(`/gestao/frequencia?${params.toString()}`)
  }

  // Garante que a competência selecionada apareça na lista mesmo sem presenças
  const opcoes = Array.from(new Set([competencia, ...competencias]))

  const comDados = dados.some((t) => t.total > 0)

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Relatório Mensal por Turma</h2>
          <p className="text-sm text-muted-foreground">Presenças e faltas de cada turma no mês selecionado</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Mês:</span>
          <select
            value={competencia}
            onChange={(e) => mudarMes(e.target.value)}
            className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
          >
            {opcoes.map((c) => (
              <option key={c} value={c}>
                {competenciaLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!comDados ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma presença registrada em {competenciaLabel(competencia)}.
        </div>
      ) : (
        <div className="space-y-3">
          {dados.map((t) => {
            const expandida = aberta === t.turmaId
            return (
              <div key={t.turmaId} className="rounded-xl border border-border bg-secondary/30">
                <button
                  type="button"
                  onClick={() => setAberta(expandida ? null : t.turmaId)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Users2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.turmaNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.presentes} presenças · {t.faltas} faltas · {t.total} registros
                    </p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${t.percentual}%`, backgroundColor: cor(t.percentual) }} />
                    </div>
                  </div>
                  <span className="text-lg font-extrabold" style={{ color: cor(t.percentual) }}>
                    {t.percentual}%
                  </span>
                  {expandida ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandida && (
                  <div className="border-t border-border px-4 py-3">
                    {t.atletas.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Sem presenças individuais neste mês.</p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="py-1.5 font-semibold">Atleta</th>
                            <th className="py-1.5 font-semibold">Presenças</th>
                            <th className="py-1.5 font-semibold">Frequência</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {t.atletas.map((a) => (
                            <tr key={a.atletaNome}>
                              <td className="py-1.5 font-medium">{a.atletaNome}</td>
                              <td className="py-1.5 text-muted-foreground">
                                {a.presentes}/{a.total}
                              </td>
                              <td className="py-1.5 font-semibold" style={{ color: cor(a.percentual) }}>
                                {a.percentual}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
