import { FUNDAMENTO_LABEL, TEAM_LABEL, type Fundamento, type TeamSide } from "./types"
import type { FundamentoBreakdown, PlayerStat, ScoutSummary } from "./stats"

/**
 * Geração de um relatório de scout em PDF desenhado do zero (não é print da tela):
 * cabeçalho, cartões de indicadores, gráficos de barras por fundamento e planilhas
 * completas por equipe. Layout profissional pensado para impressão A4.
 */

type RGB = [number, number, number]

const PALETTE = {
  ink: [15, 23, 42] as RGB, // slate-900
  sub: [100, 116, 139] as RGB, // slate-500
  line: [226, 232, 240] as RGB, // slate-200
  soft: [248, 250, 252] as RGB, // slate-50
  white: [255, 255, 255] as RGB,
  orange: [234, 88, 12] as RGB, // orange-600
  green: [22, 163, 74] as RGB,
  red: [220, 38, 38] as RGB,
  amber: [245, 158, 11] as RGB,
  blue: [37, 99, 235] as RGB,
  amberBg: [254, 249, 195] as RGB, // amber-100
}

const TEAM_HEX: Record<TeamSide, RGB> = {
  casa: [37, 99, 235], // azul
  adversario: [219, 39, 119], // rosa
}

// Colunas da planilha: grupos + sub-colunas com o extrator do valor.
type Col = { label: string; get: (s: PlayerStat) => number }
type Group = { group: string; cols: Col[] }

const f = (s: PlayerStat, fund: Fundamento) => s.porFundamento[fund]

const COLS: Group[] = [
  {
    group: "Saque",
    cols: [
      { label: "T", get: (s) => f(s, "saque").total },
      { label: "Ace", get: (s) => f(s, "saque").pontos },
      { label: "Err", get: (s) => f(s, "saque").erros },
    ],
  },
  {
    group: "Recepção",
    cols: [
      { label: "T", get: (s) => f(s, "recepcao").total },
      { label: "Err", get: (s) => f(s, "recepcao").erros },
    ],
  },
  {
    group: "Levant.",
    cols: [
      { label: "T", get: (s) => f(s, "levantamento").total },
      { label: "Pt", get: (s) => f(s, "levantamento").pontos },
      { label: "Err", get: (s) => f(s, "levantamento").erros },
    ],
  },
  {
    group: "Ataque",
    cols: [
      { label: "T", get: (s) => f(s, "ataque").total },
      { label: "Pt", get: (s) => f(s, "ataque").pontos },
      { label: "Pos", get: (s) => Math.max(0, f(s, "ataque").total - f(s, "ataque").pontos - f(s, "ataque").erros) },
      { label: "Err", get: (s) => f(s, "ataque").erros },
    ],
  },
  {
    group: "Bloqueio",
    cols: [
      { label: "T", get: (s) => f(s, "bloqueio").total },
      { label: "Pt", get: (s) => f(s, "bloqueio").pontos },
      { label: "Pos", get: (s) => Math.max(0, f(s, "bloqueio").total - f(s, "bloqueio").pontos - f(s, "bloqueio").erros) },
      { label: "Err", get: (s) => f(s, "bloqueio").erros },
    ],
  },
  {
    group: "Defesa",
    cols: [
      { label: "T", get: (s) => f(s, "defesa").total },
      { label: "Atq", get: (s) => s.defesaPorTipo.ataque },
      { label: "Vol", get: (s) => s.defesaPorTipo.volume },
      { label: "Rec", get: (s) => s.defesaPorTipo.recuperacao },
    ],
  },
]

const FLAT_COLS = COLS.flatMap((g) => g.cols)

export interface ExportScoutPdfInput {
  summary: ScoutSummary
  breakdowns: FundamentoBreakdown[]
  statsByTeam: Record<TeamSide, PlayerStat[]>
  teamsToShow: TeamSide[]
  teamAName?: string
  teamBName?: string
  teamFilter: TeamSide | "todos"
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export async function exportScoutPdf(input: ExportScoutPdfInput) {
  const { summary, breakdowns, statsByTeam, teamsToShow, teamAName, teamBName, teamFilter } = input

  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableMod.default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 36
  const contentW = pageW - M * 2
  let y = M

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])

  const ensure = (h: number) => {
    if (y + h > pageH - M) {
      doc.addPage("a4", "portrait")
      y = M
    }
  }

  // ---------- Cabeçalho ----------
  const headerH = 74
  setFill(PALETTE.ink)
  doc.rect(0, 0, pageW, headerH, "F")
  // acento laranja no topo
  setFill(PALETTE.orange)
  doc.rect(0, 0, pageW, 4, "F")

  setText(PALETTE.orange)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("VOLLEY TECH  ·  SCOUT VIEW", M, 26)

  setText(PALETTE.white)
  doc.setFontSize(20)
  doc.text("Relatório de Scout", M, 48)

  const nameA = teamAName || TEAM_LABEL.casa
  const nameB = teamBName || TEAM_LABEL.adversario
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  setText([203, 213, 225]) // slate-300
  doc.text(`${nameA}   ×   ${nameB}`, M, 64)

  // bloco direito: equipe filtrada + data
  const filterLabel =
    teamFilter === "todos" ? "Ambas as equipes" : teamFilter === "casa" ? nameA : nameB
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  doc.setFontSize(8)
  setText([148, 163, 184]) // slate-400
  doc.text(`Equipe: ${filterLabel}`, pageW - M, 40, { align: "right" })
  doc.text(`Gerado em ${dateStr}`, pageW - M, 54, { align: "right" })

  y = headerH + 22

  // ---------- Cartões de indicadores (KPIs) ----------
  const saldo = summary.totalPontos - summary.totalErros
  const kpis: { label: string; value: string; accent: RGB }[] = [
    { label: "Total de ações", value: String(summary.totalAcoes), accent: PALETTE.blue },
    { label: "Pontos", value: String(summary.totalPontos), accent: PALETTE.green },
    { label: "Erros", value: String(summary.totalErros), accent: PALETTE.red },
    { label: "Saldo (Pt − Err)", value: (saldo > 0 ? "+" : "") + saldo, accent: PALETTE.orange },
  ]
  const kpiGap = 12
  const kpiW = (contentW - kpiGap * 3) / 4
  const kpiH = 58
  kpis.forEach((k, i) => {
    const x = M + i * (kpiW + kpiGap)
    setFill(PALETTE.white)
    setDraw(PALETTE.line)
    doc.setLineWidth(0.8)
    doc.roundedRect(x, y, kpiW, kpiH, 7, 7, "FD")
    // barra de acento à esquerda
    setFill(k.accent)
    doc.roundedRect(x, y, 4, kpiH, 2, 2, "F")
    setText(PALETTE.sub)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.text(k.label.toUpperCase(), x + 12, y + 20)
    setText(k.accent)
    doc.setFontSize(24)
    doc.text(k.value, x + 12, y + 46)
  })
  y += kpiH + 26

  // ---------- Seção: gráficos por fundamento ----------
  const sectionTitle = (title: string) => {
    ensure(26)
    setFill(PALETTE.orange)
    doc.roundedRect(M, y - 9, 4, 14, 2, 2, "F")
    setText(PALETTE.ink)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(title, M + 12, y + 2)
    y += 18
  }

  sectionTitle("Distribuição por fundamento")

  const chartGap = 14
  const chartW = (contentW - chartGap) / 2
  const chartPad = 12
  const chartHeaderH = 22
  const barRowH = 16
  const withData = breakdowns.filter((b) => b.total > 0)

  for (let i = 0; i < withData.length; i += 2) {
    const pair = withData.slice(i, i + 2)
    const heights = pair.map((b) => chartPad + chartHeaderH + b.segments.length * barRowH + chartPad)
    const rowH = Math.max(...heights)
    ensure(rowH + 10)

    pair.forEach((b, j) => {
      const x = M + j * (chartW + chartGap)
      // caixa
      setFill(PALETTE.white)
      setDraw(PALETTE.line)
      doc.setLineWidth(0.8)
      doc.roundedRect(x, y, chartW, rowH, 8, 8, "FD")
      // cabeçalho da caixa
      setText(PALETTE.ink)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10.5)
      doc.text(FUNDAMENTO_LABEL[b.fundamento], x + chartPad, y + 18)
      setText(PALETTE.sub)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text(`${b.total} ${b.total === 1 ? "ação" : "ações"}`, x + chartW - chartPad, y + 18, {
        align: "right",
      })
      // barras
      const maxVal = Math.max(1, ...b.segments.map((s) => s.value))
      const labelW = 78
      const valueW = 26
      const trackX = x + chartPad + labelW
      const trackW = chartW - chartPad * 2 - labelW - valueW
      b.segments.forEach((seg, k) => {
        const by = y + chartHeaderH + chartPad + k * barRowH
        // rótulo
        setText(PALETTE.sub)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.text(seg.label, x + chartPad, by + 4, { maxWidth: labelW - 4 })
        // trilho
        setFill(PALETTE.soft)
        doc.roundedRect(trackX, by - 5, trackW, 9, 4, 4, "F")
        // preenchimento
        const fillW = Math.max(seg.value > 0 ? 4 : 0, (seg.value / maxVal) * trackW)
        if (fillW > 0) {
          setFill(hexToRgb(seg.color))
          doc.roundedRect(trackX, by - 5, fillW, 9, 4, 4, "F")
        }
        // valor
        setText(PALETTE.ink)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8.5)
        doc.text(String(seg.value), x + chartW - chartPad, by + 4, { align: "right" })
      })
    })
    y += rowH + 12
  }

  // ---------- Planilhas por equipe ----------
  y += 6
  for (const team of teamsToShow) {
    const stats = statsByTeam[team]
    if (!stats || stats.length === 0) continue

    const accent = TEAM_HEX[team]
    ensure(60)

    // título da equipe
    setFill(PALETTE.orange)
    doc.roundedRect(M, y - 9, 4, 14, 2, 2, "F")
    setText(PALETTE.ink)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`Planilha — ${TEAM_LABEL[team]}`, M + 12, y + 2)
    y += 14

    // totais e TGP (base = pontos da equipe)
    const teamPts = stats.reduce((acc, s) => acc + s.pontos, 0)
    const colTotals = FLAT_COLS.map((c) => stats.reduce((acc, s) => acc + c.get(s), 0))
    const totTP = stats.reduce((acc, s) => acc + (s.pontos + s.positivas), 0)
    const totTE = stats.reduce((acc, s) => acc + s.erros, 0)
    const totTGP = teamPts === 0 ? 0 : 100

    const head = [
      [
        { content: "Nº", rowSpan: 2 },
        { content: "Atleta", rowSpan: 2 },
        ...COLS.map((g) => ({ content: g.group, colSpan: g.cols.length })),
        { content: "TP", rowSpan: 2 },
        { content: "TE", rowSpan: 2 },
        { content: "TGP", rowSpan: 2 },
      ],
      FLAT_COLS.map((c) => c.label),
    ]

    const body = stats.map((s) => {
      const tp = s.pontos + s.positivas
      const tgp = teamPts === 0 ? 0 : Math.round((tp / teamPts) * 100)
      return [
        String(s.player.number),
        s.player.name,
        ...FLAT_COLS.map((c) => String(c.get(s))),
        String(tp),
        String(s.erros),
        `${tgp}%`,
      ]
    })

    const foot = [
      [
        { content: "RESULTADO GERAL", colSpan: 2, styles: { halign: "left" as const } },
        ...colTotals.map((v) => String(v)),
        String(totTP),
        String(totTE),
        `${totTGP}%`,
      ],
    ]

    // índices de colunas especiais
    const nCols = 2 + FLAT_COLS.length + 3
    const tpIdx = 2 + FLAT_COLS.length
    const teIdx = tpIdx + 1
    const tgpIdx = teIdx + 1

    autoTable(doc, {
      startY: y,
      head,
      body,
      foot,
      margin: { left: M, right: M },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
        lineColor: PALETTE.line,
        lineWidth: 0.5,
        textColor: [51, 65, 85],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: accent,
        textColor: PALETTE.white,
        fontStyle: "bold",
        fontSize: 7,
        lineColor: accent,
      },
      footStyles: {
        fillColor: [254, 240, 138], // amber-200
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: PALETTE.soft },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold", textColor: accent },
        1: { halign: "left", cellWidth: "auto", fontStyle: "bold", textColor: [51, 65, 85] },
      },
      didParseCell: (data) => {
        // destaca TP (verde), TE (vermelho) e TGP (fundo amarelo) no corpo e rodapé.
        if (data.section === "body" || data.section === "foot") {
          if (data.column.index === tpIdx) {
            data.cell.styles.textColor = [22, 101, 52]
            data.cell.styles.fontStyle = "bold"
          } else if (data.column.index === teIdx) {
            data.cell.styles.textColor = [153, 27, 27]
            data.cell.styles.fontStyle = "bold"
          } else if (data.column.index === tgpIdx) {
            data.cell.styles.fillColor = PALETTE.amberBg
            data.cell.styles.fontStyle = "bold"
          }
        }
      },
    })

    // avança o cursor após a tabela
    const after = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    y = (after?.finalY ?? y) + 26
    void nCols
  }

  // ---------- Rodapé com numeração ----------
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    setDraw(PALETTE.line)
    doc.setLineWidth(0.5)
    doc.line(M, pageH - 24, pageW - M, pageH - 24)
    setText(PALETTE.sub)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text("Volley Tech · Scout View", M, pageH - 12)
    doc.text(`Página ${p} de ${total}`, pageW - M, pageH - 12, { align: "right" })
  }

  doc.save("scout-relatorio.pdf")
}
