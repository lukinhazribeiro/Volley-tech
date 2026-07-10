import {
  CircleDollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users2,
  MapPin,
  Clock,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Plus,
  AlertTriangle,
  Info,
  Gift,
} from "lucide-react"
import Link from "next/link"
import { AppShell } from "@/components/gestao/app-shell"
import { StatCard } from "@/components/gestao/stat-card"
import { Panel, VerTodos } from "@/components/gestao/panel"
import {
  PresencasSemanaChart,
  ReceitaDonut,
  CategoriaDonut,
  AnaliseCombinada,
} from "@/components/gestao/charts"
import {
  getIndicadores,
  getPresencasSemana,
  getFrequenciaPorTurma,
  getMensalidadesAtraso,
  getProximosTreinos,
  getAtletasPorCategoria,
  getSerieMensal,
} from "@/lib/gestao/queries/dashboard"

export const dynamic = "force-dynamic"

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const spark = (seed: number) =>
  Array.from({ length: 16 }, (_, i) => 40 + Math.round(Math.sin(i / 2 + seed) * 20 + ((i * 7 + seed * 13) % 12)))

export default async function DashboardPage() {
  const [ind, semana, freqTurma, atraso, treinos, categorias, serie] = await Promise.all([
    getIndicadores(),
    getPresencasSemana(),
    getFrequenciaPorTurma(),
    getMensalidadesAtraso(),
    getProximosTreinos(),
    getAtletasPorCategoria(),
    getSerieMensal(),
  ])

  const palette = [
    "var(--color-primary)",
    "var(--color-success)",
    "var(--color-info)",
    "var(--color-chart-5)",
    "var(--color-destructive)",
  ]
  const totalCat = categorias.reduce((s, c) => s + c.total, 0) || 1

  return (
    <AppShell
      title="Gestão de Clube"
      subtitle="Painel geral do seu clube"
      action={
        <Link
          href="/gestao/atletas/novo"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Atleta</span>
        </Link>
      }
    >
      {/* Indicadores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total de Atletas"
              value={String(ind.totalAtletas)}
              subtitle={`Ativos: ${ind.ativos} | Inativos: ${ind.inativos}`}
              icon="Users"
              tone="primary"
              data={spark(1)}
            />
            <StatCard
              title="Presenças (Hoje)"
              value={String(ind.presencasHoje)}
              subtitle={`${ind.percentualPresenca}% de presença`}
              icon="UserCheck"
              tone="success"
              percent={ind.percentualPresenca}
              data={spark(2)}
            />
            <StatCard
              title="Ausências (Hoje)"
              value={String(ind.ausenciasHoje)}
              subtitle={`${ind.percentualAusencia}% de ausência`}
              icon="UserX"
              tone="destructive"
              percent={ind.percentualAusencia}
              data={spark(3)}
            />
            <StatCard
              title="Mensalidades Pagas"
              value={brl(ind.receitaRecebida)}
              subtitle={`${ind.percentualPago}% do total`}
              icon="CircleDollarSign"
              tone="info"
              percent={ind.percentualPago}
              data={spark(4)}
              variant="bar"
            />
            <StatCard
              title="Pendências"
              value={brl(ind.receitaPendente)}
              subtitle={`${ind.percentualPendente}% do total`}
              icon="AlertCircle"
              tone="primary"
              percent={ind.percentualPendente}
              data={spark(5)}
              variant="bar"
            />
          </div>

          {/* Linha 2: presenças, receita, resumo financeiro */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Presenças da Semana"
              action={<span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Esta semana</span>}
            >
              <PresencasSemanaChart data={semana} />
            </Panel>

            <Panel
              title="Receita do Mês"
              action={<span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Este mês</span>}
            >
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
                <ReceitaDonut recebida={ind.receitaRecebida} pendente={ind.receitaPendente} />
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
                    <div>
                      <p className="text-sm text-muted-foreground">Receita recebida</p>
                      <p className="text-sm font-bold">
                        {brl(ind.receitaRecebida)} ({ind.percentualPago}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pendências</p>
                      <p className="text-sm font-bold">
                        {brl(ind.receitaPendente)} ({ind.percentualPendente}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Resumo Financeiro"
              action={<span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Este mês</span>}
            >
              <ul className="space-y-4">
                <ResumoItem icon={Wallet} tone="var(--color-muted-foreground)" label="Receita prevista" value={brl(ind.receitaPrevista)} />
                <ResumoItem icon={TrendingUp} tone="var(--color-success)" label="Receita recebida" value={brl(ind.receitaRecebida)} />
                <ResumoItem icon={CircleDollarSign} tone="var(--color-primary)" label="Receita pendente" value={brl(ind.receitaPendente)} />
                <ResumoItem icon={TrendingDown} tone="var(--color-destructive)" label="Inadimplência" value={`${ind.inadimplencia}%`} />
              </ul>
              <Link
                href="/gestao/financeiro"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                Ver relatório completo
              </Link>
            </Panel>
          </div>

          {/* Linha 3: atraso, frequência por turma, próximos treinos */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Mensalidades em Atraso" action={<VerTodos href="/gestao/financeiro" />}>
              {atraso.length === 0 ? (
                <EmptyState label="Nenhuma mensalidade em atraso" />
              ) : (
                <ul className="divide-y divide-border">
                  {atraso.map((m, i) => (
                    <li key={i}>
                      <Link href="/gestao/financeiro" className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-80">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {initials(m.nome)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.turma} · Venc.{" "}
                            {m.vencimento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{brl(m.valor)}</span>
                        <span className="rounded-md bg-destructive/15 px-2 py-1 text-[11px] font-semibold text-destructive">
                          {m.diasAtraso} dias
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Frequência por Turma" action={<VerTodos href="/gestao/frequencia" />}>
              {freqTurma.length === 0 ? (
                <EmptyState label="Cadastre turmas e faça check-ins" />
              ) : (
                <ul className="space-y-3.5">
                  {freqTurma.map((t, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Users2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="w-32 shrink-0 truncate text-sm">{t.nome}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${t.percentual}%`,
                            backgroundColor: t.percentual >= 85 ? "var(--color-success)" : "var(--color-primary)",
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-semibold">{t.percentual}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Próximos Treinos" action={<VerTodos href="/gestao/turmas" />}>
              {treinos.length === 0 ? (
                <EmptyState label="Nenhuma turma cadastrada" />
              ) : (
                <ul className="space-y-3">
                  {treinos.map((t, i) => (
                    <li key={i}>
                      <Link href="/gestao/turmas" className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-muted">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Users2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.nome}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {t.horario}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {t.quadra}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/gestao/turmas"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <CalendarDays className="h-4 w-4" />
                Ver calendário completo
              </Link>
            </Panel>
          </div>

          {/* Linha 4: gráficos analíticos + alertas */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Análise Comparativa"
              className="xl:col-span-2"
              action={
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Últimos meses</span>
              }
            >
              <p className="-mt-2 mb-3 text-xs text-muted-foreground">
                Receita, frequência e inadimplência lado a lado ao longo do tempo
              </p>
              <AnaliseCombinada
                receita={serie.receita}
                frequencia={serie.frequencia}
                inadimplencia={serie.inadimplencia}
              />
            </Panel>

            <Panel title="Alertas" action={<VerTodos href="/gestao/relatorios" />}>
              <ul className="space-y-3">
                <Alerta
                  icon={AlertTriangle}
                  tone="var(--color-destructive)"
                  title={`${atraso.length} atletas com mensalidades em atraso`}
                  href="/gestao/financeiro"
                />
                <Alerta
                  icon={AlertCircle}
                  tone="var(--color-warning)"
                  title={`${freqTurma.filter((t) => t.percentual < 75).length} atletas com frequência abaixo de 75%`}
                  href="/gestao/frequencia"
                />
                <Alerta icon={Info} tone="var(--color-info)" title="Aniversariantes da semana" href="/gestao/atletas" />
                <Alerta icon={Gift} tone="var(--color-chart-5)" title="Bolsas: gerencie descontos por atleta" href="/gestao/atletas" />
              </ul>
              <Link
                href="/gestao/relatorios"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.01]"
              >
                <CalendarDays className="h-4 w-4" />
                Ver todos os alertas
              </Link>
            </Panel>
          </div>

          {/* Distribuição por categoria */}
          <Panel title="Distribuição de Atletas por Categoria">
            {categorias.every((c) => c.total === 0) ? (
              <EmptyState label="Cadastre atletas para ver a distribuição por categoria" />
            ) : (
              <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[220px_1fr]">
                <CategoriaDonut data={categorias} />
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categorias.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                      <span className="truncate text-muted-foreground">{c.nome}</span>
                      <span className="ml-auto font-semibold">
                        {c.total} <span className="text-xs text-muted-foreground">({Math.round((c.total / totalCat) * 100)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {/* Ações rápidas */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4 lg:grid-cols-5">
            <QuickAction href="/gestao/atletas/novo" icon={Plus} label="Novo Atleta" primary />
            <QuickAction href="/gestao/turmas/novo" icon={Users2} label="Nova Turma" />
            <QuickAction href="/gestao/check-in" icon={ClipboardCheck} label="Fazer Check-in" />
            <QuickAction href="/gestao/pagamentos" icon={CircleDollarSign} label="Registrar Pagamento" />
            <QuickAction href="/gestao/relatorios" icon={FileText} label="Gerar Relatório" />
          </div>
    </AppShell>
  )
}

function ResumoItem({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in oklch, ${tone} 18%, transparent)`, color: tone }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-bold" style={{ color: tone }}>
        {value}
      </span>
    </li>
  )
}

function Alerta({ icon: Icon, tone, title, href }: { icon: any; tone: string; title: string; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-muted"
      >
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `color-mix(in oklch, ${tone} 18%, transparent)`, color: tone }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium leading-snug">{title}</p>
          <p className="text-xs text-primary">Clique para visualizar</p>
        </div>
      </Link>
    </li>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string
  icon: any
  label: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.02]"
          : "flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function initials(nome: string) {
  const p = nome.trim().split(" ")
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase()
}
