import type { FundamentoBreakdown, PlayerStat, ScoutSummary } from "./stats"
import { TEAM_LABEL, type Fundamento, type TeamSide } from "./types"

/** Carrega a logo da Volley Tech como dataURL para embutir no PDF (marca do documento). */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/volley-tech-logo.png")
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Converte "#rrggbb" em tupla [r, g, b] para as APIs do jsPDF. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

// Paleta do documento.
const C = {
  orange: rgb("#ea580c"),
  orangeSoft: rgb("#fff7ed"),
  ink: rgb("#0f172a"),
  slate700: rgb("#334155"),
  slate500: rgb("#64748b"),
  slate400: rgb("#94a3b8"),
  slate200: rgb("#e2e8f0"),
  slate100: rgb("#f1f5f9"),
  slate50: rgb("#f8fafc"),
  white: rgb("#ffffff"),
  blue: rgb("#2563eb"),
  blueDark: rgb("#1d4ed8"),
  blueLight: rgb("#3b82f6"),
  emerald: rgb("#16a34a"),
  red: rgb("#dc2626"),
  amber: rgb("#f59e0b"),
  amberFill: rgb("#fef08a"),
  yellowCell: rgb("#fef9c3"),
}

// Colunas da planilha (mesma estrutura da tabela em tela).
type Col = { label: string; get: (s: PlayerStat) => number }
const COL_GROUPS: { group: string; cols: Col[] }[] = [
  {
    group: "SAQUE",
    cols: [
      { label: "T", get: (s) => s.porFundamento.saque.total },
      { label: "Ace", get: (s) => s.porFundamento.saque.pontos },
      { label: "Err", get: (s) => s.porFundamento.saque.erros },
    ],
  },
  {
    group: "RECEPÇÃO",
    cols: [
      { label: "T", get: (s) => s.porFundamento.recepcao.total },
      { label: "Err", get: (s) => s.porFundamento.recepcao.erros },
    ],
  },
  {
    group: "LEV.",
    cols: [
      { label: "T", get: (s) => s.porFundamento.levantamento.total },
      { label: "Pt", get: (s) => s.porFundamento.levantamento.pontos },
      { label: "Err", get: (s) => s.porFundamento.levantamento.erros },
    ],
  },
  {
    group: "ATAQUE",
    cols: [
      { label: "T", get: (s) => s.porFundamento.ataque.total },
      { label: "Pt", get: (s) => s.porFundamento.ataque.pontos },
      {
        label: "Pos",
        get: (s) => {
          const a = s.porFundamento.ataque
          return a.total - a.pontos - a.erros
        },
      },
      { label: "Err", get: (s) => s.porFundamento.ataque.erros },
    ],
  },
  {
    group: "BLOQUEIO",
    cols: [
      { label: "T", get: (s) => s.porFundamento.bloqueio.total },
      { label: "Pt", get: (s) => s.porFundamento.bloqueio.pontos },
      {
        label: "Pos",
        get: (s) => {
          const b = s.porFundamento.bloqueio
          return b.total - b.pontos - b.erros
        },
      },
      { label: "Err", get: (s) => s.porFundamento.bloqueio.erros },
    ],
  },
  {
    group: "DEFESA",
    cols: [
      { label: "T", get: (s) => s.porFundamento.defesa.total },
      { label: "Atq", get: (s) => s.defesaPorTipo.ataque },
      { label: "Vol", get: (s) => s.defesaPorTipo.volume },
      { label: "Rec", get: (s) => s.defesaPorTipo.recuperacao },
    ],
  },
]
const FLAT: Col[] = COL_GROUPS.flatMap((g) => g.cols)

export interface ExportPdfParams {
  summary: ScoutSummary
  breakdowns: FundamentoBreakdown[]
  statsByTeam: Record<TeamSide, PlayerStat[]>
  teamsToShow: TeamSide[]
  teamAName?: string
  teamBName?: string
  teamFilterLabel: string
}

const FUND_TITLE: Record<Fundamento, string> = {
  saque: "Saque",
  recepcao: "Recepção",
  levantamento: "Levantamento",
  ataque: "Ataque",
  bloqueio: "Bloqueio",
  defesa: "Defesa",
}

/**
 * Gera um relatório PDF desenhado vetorialmente (não é screenshot): cabeçalho de
 * documento, caixas de indicadores, gráficos de barras por fundamento e as
 * planilhas por equipe com cabeçalho agrupado — layout limpo e profissional.
 */
export async function exportScoutPdf(params: ExportPdfParams) {
  const { summary, breakdowns, statsByTeam, teamsToShow, teamAName, teamBName, teamFilterLabel } =
    params

  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableMod.default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 40
  const CW = pageW - M * 2

  let y = M

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // ---------- Cabeçalho ----------
  const logoData = await loadLogoDataUrl()
  const headerH = 76
  doc.setFillColor(...C.ink)
  doc.roundedRect(M, y, CW, headerH, 8, 8, "F")
  // Faixa lateral laranja.
  doc.setFillColor(...C.orange)
  doc.roundedRect(M, y, 6, headerH, 3, 3, "F")
  doc.rect(M + 3, y, 4, headerH, "F")

  // Logo da marca (à esquerda). O texto desloca para a direita quando há logo.
  const logoSize = 46
  let textX = M + 22
  if (logoData) {
    doc.addImage(logoData, "PNG", M + 18, y + (headerH - logoSize) / 2, logoSize, logoSize)
    textX = M + 18 + logoSize + 14
  }

  doc.setTextColor(...C.orange)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("VOLLEY TECH  ·  SCOUT VIEW", textX, y + 22)

  doc.setTextColor(...C.white)
  doc.setFontSize(20)
  doc.text("Relatório de Scout", textX, y + 46)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(226, 232, 240)
  doc.text(`${teamAName || "Equipe A"}   ×   ${teamBName || "Equipe B"}`, textX, y + 64)

  // Bloco direito: equipe filtrada + data.
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Equipe: ${teamFilterLabel}`, M + CW - 14, y + 30, { align: "right" })
  doc.text(`Gerado em ${dateLabel}`, M + CW - 14, y + 46, { align: "right" })

  y += headerH + 20

  // ---------- Caixas de indicadores (KPI) ----------
  const kpis: { label: string; value: number; accent: [number, number, number] }[] = [
    { label: "Ações totais", value: summary.totalAcoes, accent: C.blue },
    { label: "Pontos", value: summary.totalPontos, accent: C.emerald },
    { label: "Erros", value: summary.totalErros, accent: C.red },
    { label: "Saldo", value: summary.totalPontos - summary.totalErros, accent: C.amber },
  ]
  const kpiGap = 12
  const kpiW = (CW - kpiGap * 3) / 4
  const kpiH = 62
  kpis.forEach((k, i) => {
    const kx = M + i * (kpiW + kpiGap)
    doc.setFillColor(...C.white)
    doc.setDrawColor(...C.slate200)
    doc.setLineWidth(0.8)
    doc.roundedRect(kx, y, kpiW, kpiH, 7, 7, "FD")
    // Barra de acento no topo.
    doc.setFillColor(...k.accent)
    doc.roundedRect(kx, y, kpiW, 4, 2, 2, "F")
    // Ponto + rótulo.
    doc.setFillColor(...k.accent)
    doc.circle(kx + 14, y + 22, 3, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...C.slate500)
    doc.text(k.label, kx + 22, y + 25)
    // Valor.
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(...C.ink)
    doc.text(String(k.value), kx + 14, y + 50)
  })

  y += kpiH + 24

  // ---------- Título da seção de gráficos ----------
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...C.slate400)
  doc.text("GRÁFICOS POR FUNDAMENTO", M, y)
  y += 12

  // ---------- Cartões de gráfico (2 por linha) ----------
  const cardGap = 14
  const cardW = (CW - cardGap) / 2
  const withData = breakdowns.filter((b) => b.total > 0)

  const cardHeight = (b: FundamentoBreakdown) => {
    const segs = b.segments.filter((s) => s.value > 0)
    return 34 + Math.max(segs.length, 1) * 16 + 10
  }

  let i = 0
  while (i < withData.length) {
    const rowCards = withData.slice(i, i + 2)
    const rowH = Math.max(...rowCards.map(cardHeight))

    // Quebra de página se o cartão não couber.
    if (y + rowH > pageH - M) {
      doc.addPage()
      y = M
    }

    rowCards.forEach((b, col) => {
      const cx = M + col * (cardW + cardGap)
      drawChartCard(doc, b, cx, y, cardW, rowH)
    })

    y += rowH + cardGap
    i += 2
  }

  // ---------- Planilhas por equipe ----------
  for (const team of teamsToShow) {
    const stats = statsByTeam[team]
    if (!stats || stats.length === 0) continue

    if (y + 90 > pageH - M) {
      doc.addPage()
      y = M
    } else {
      y += 8
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...C.slate400)
    doc.text(`PLANILHA · ${TEAM_LABEL[team].toUpperCase()}`, M, y)
    y += 8

    const teamPts = stats.reduce((acc, s) => acc + s.pontos, 0)

    // Cabeçalho agrupado (linha de grupos + linha de subcolunas).
    const groupRow = [
      { content: "Nº", rowSpan: 2 },
      { content: "Atleta", rowSpan: 2, styles: { halign: "left" as const } },
      ...COL_GROUPS.map((g) => ({ content: g.group, colSpan: g.cols.length })),
      { content: "TP", rowSpan: 2 },
      { content: "TE", rowSpan: 2 },
      { content: "TGP", rowSpan: 2, styles: { fillColor: C.blueDark } },
    ]
    const subRow = FLAT.map((c) => ({ content: c.label }))

    const body = stats.map((s) => {
      const tp = s.pontos + s.positivas
      const tgp = teamPts === 0 ? 0 : Math.round((tp / teamPts) * 100)
      return [
        String(s.player.number),
        s.player.name,
        ...FLAT.map((c) => {
          const v = c.get(s)
          return v === 0 ? "-" : String(v)
        }),
        String(tp),
        String(s.erros),
        `${tgp}%`,
      ]
    })

    // Rodapé (RESULTADO GERAL).
    const colTotals = FLAT.map((c) => stats.reduce((acc, s) => acc + c.get(s), 0))
    const totTP = stats.reduce((acc, s) => acc + s.pontos + s.positivas, 0)
    const totTE = stats.reduce((acc, s) => acc + s.erros, 0)
    const foot = [
      { content: "RESULTADO GERAL", colSpan: 2, styles: { halign: "left" as const } },
      ...colTotals.map((v) => String(v)),
      String(totTP),
      String(totTE),
      `${teamPts === 0 ? 0 : 100}%`,
    ]

    const lastIdx = 2 + FLAT.length + 2 // índice da coluna TGP
    const tpIdx = 2 + FLAT.length
    const teIdx = tpIdx + 1

    autoTable(doc, {
      startY: y + 4,
      head: [groupRow, subRow],
      body,
      foot: [foot],
      theme: "grid",
      margin: { left: M, right: M },
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
        lineColor: C.slate200,
        lineWidth: 0.5,
        textColor: C.slate700,
      },
      headStyles: {
        fillColor: C.blue,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 7,
        lineColor: C.blueLight,
      },
      footStyles: {
        fillColor: C.amberFill,
        textColor: C.ink,
        fontStyle: "bold",
        lineColor: C.amber,
      },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 22 },
        1: { halign: "left", cellWidth: "auto" },
      },
      didParseCell: (data) => {
        // Segunda linha do cabeçalho (subcolunas) em azul mais claro.
        if (data.section === "head" && data.row.index === 1) {
          data.cell.styles.fillColor = C.blueLight
        }
        // Coluna TGP destacada em amarelo no corpo.
        if (data.section === "body" && data.column.index === lastIdx) {
          data.cell.styles.fillColor = C.yellowCell
          data.cell.styles.fontStyle = "bold"
        }
        // TP em verde e TE em vermelho no corpo.
        if (data.section === "body" && data.column.index === tpIdx) {
          data.cell.styles.textColor = C.emerald
          data.cell.styles.fontStyle = "bold"
        }
        if (data.section === "body" && data.column.index === teIdx) {
          data.cell.styles.textColor = C.red
          data.cell.styles.fontStyle = "bold"
        }
        // Zeros representados por "-" em cinza claro.
        if (data.section === "body" && data.cell.text.join("") === "-") {
          data.cell.styles.textColor = C.slate400
        }
      },
    })

    // Atualiza o cursor para depois da tabela.
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    y = (finalY ?? y) + 18
  }

  // ---------- Rodapé com numeração ----------
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(...C.slate200)
    doc.setLineWidth(0.5)
    doc.line(M, pageH - 28, pageW - M, pageH - 28)
    let footTextX = M
    if (logoData) {
      doc.addImage(logoData, "PNG", M, pageH - 24, 11, 11)
      footTextX = M + 15
    }
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...C.slate400)
    doc.text("Volley Tech · Scout View", footTextX, pageH - 16)
    doc.text(`Página ${p} de ${pageCount}`, pageW - M, pageH - 16, { align: "right" })
  }

  doc.save("scout-relatorio.pdf")
}

/** Desenha um cartão de gráfico com barras horizontais por segmento. */
function drawChartCard(
  doc: import("jspdf").jsPDF,
  b: FundamentoBreakdown,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Caixa.
  doc.setFillColor(...C.white)
  doc.setDrawColor(...C.slate200)
  doc.setLineWidth(0.8)
  doc.roundedRect(x, y, w, h, 7, 7, "FD")

  // Cabeçalho do cartão.
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...C.ink)
  doc.text(FUND_TITLE[b.fundamento], x + 12, y + 18)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...C.slate400)
  doc.text(`${b.total} ações`, x + w - 12, y + 18, { align: "right" })

  // Linha separadora.
  doc.setDrawColor(...C.slate100)
  doc.setLineWidth(0.5)
  doc.line(x + 12, y + 24, x + w - 12, y + 24)

  const segs = b.segments.filter((s) => s.value > 0)
  const maxVal = Math.max(1, ...segs.map((s) => s.value))

  const labelW = 78
  const valueW = 22
  const barX = x + 12 + labelW
  const barMaxW = w - 24 - labelW - valueW
  let by = y + 38

  if (segs.length === 0) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(7)
    doc.setTextColor(...C.slate400)
    doc.text("Sem dados", x + 12, by)
    return
  }

  segs.forEach((s) => {
    const color = rgb(s.color)
    // Rótulo.
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...C.slate700)
    doc.text(clip(doc, s.label, labelW - 4), x + 12, by + 3)
    // Trilho.
    doc.setFillColor(...C.slate100)
    doc.roundedRect(barX, by - 5, barMaxW, 9, 2, 2, "F")
    // Preenchimento proporcional.
    const fillW = Math.max(3, (s.value / maxVal) * barMaxW)
    doc.setFillColor(...color)
    doc.roundedRect(barX, by - 5, fillW, 9, 2, 2, "F")
    // Valor.
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(...color)
    doc.text(String(s.value), x + w - 12, by + 3, { align: "right" })
    by += 16
  })
}

/** Corta o texto para caber numa largura máxima, adicionando reticências. */
function clip(doc: import("jspdf").jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text
  let t = text
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) {
    t = t.slice(0, -1)
  }
  return `${t}…`
}
