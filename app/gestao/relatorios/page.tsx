import { AppShell } from "@/components/gestao/app-shell"
import { listAtletas } from "@/app/gestao/actions/atletas"
import { listMensalidades, resumoFinanceiro } from "@/app/gestao/actions/financeiro"
import { frequenciaPorTurma } from "@/app/gestao/actions/frequencia"
import { RelatorioViewer } from "@/components/gestao/relatorio-viewer"

export const dynamic = "force-dynamic"

export default async function RelatoriosPage() {
  const [atletas, mensalidades, resumo, freqTurma] = await Promise.all([
    listAtletas(),
    listMensalidades("todas"),
    resumoFinanceiro(),
    frequenciaPorTurma(),
  ])

  const emAtraso = mensalidades.filter((m) => m.status === "atrasado")

  return (
    <AppShell title="Relatórios" subtitle="Gere e exporte relatórios em PDF">
      <RelatorioViewer
        atletas={atletas.map((a) => ({
          nome: a.nome,
          turma: a.turmaNome,
          categoria: a.categoriaNome,
          mensalidade: Number(a.valorMensalidade),
          ativo: a.ativo,
        }))}
        mensalidades={mensalidades}
        emAtraso={emAtraso}
        freqTurma={freqTurma}
        resumo={resumo}
      />
    </AppShell>
  )
}
