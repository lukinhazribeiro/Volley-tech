import { AppShell } from "@/components/gestao/app-shell"
import { atletasParaRelatorio } from "@/app/gestao/actions/atletas"
import { listMensalidades, anosComMovimento, balancoAnual } from "@/app/gestao/actions/financeiro"
import { competenciasComPresenca, gradeFrequenciaMensal } from "@/app/gestao/actions/frequencia"
import { listDespesas } from "@/app/gestao/actions/despesas"
import { competenciaAtual } from "@/lib/gestao/format"
import { RelatorioViewer } from "@/components/gestao/relatorio-viewer"

export const dynamic = "force-dynamic"

export default async function RelatoriosPage() {
  const [atletas, mensalidades, competencias, anos] = await Promise.all([
    atletasParaRelatorio(),
    listMensalidades("todas"),
    competenciasComPresenca(),
    anosComMovimento(),
  ])

  const compInicial = competencias[0] ?? competenciaAtual()
  const anoInicial = anos[0] ?? new Date().getFullYear()

  const [gradeInicial, balancoInicial, despesasInicial] = await Promise.all([
    gradeFrequenciaMensal(compInicial),
    balancoAnual(anoInicial),
    listDespesas(anoInicial),
  ])

  const emAtraso = mensalidades.filter((m) => m.status === "atrasado")

  return (
    <AppShell title="Relatórios" subtitle="Gere e exporte relatórios em PDF">
      <RelatorioViewer
        atletas={atletas}
        emAtraso={emAtraso}
        competencias={competencias}
        anos={anos}
        compInicial={compInicial}
        anoInicial={anoInicial}
        gradeInicial={gradeInicial}
        balancoInicial={balancoInicial}
        despesasInicial={despesasInicial}
      />
    </AppShell>
  )
}
