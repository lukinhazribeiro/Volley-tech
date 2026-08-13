import type { ActionMatch } from "./types"
import { computeMatchStats, matchTotals } from "./types"

/**
 * Relatório PDF do Scout Action — mesmo padrão visual dos outros relatórios
 * (jsPDF + autotable), porém enxuto: só TG / TP / TE / TGP por atleta.
 */
export async function exportActionMatchPdf(match: ActionMatch) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const stats = computeMatchStats(match).sort((a, b) => b.tgp - a.tgp)
  const totals = matchTotals(match)

  // ---- Cabeçalho ----
  doc.setFillColor(234, 88, 12) // laranja Volley Tech
  doc.rect(0, 0, 210, 26, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Scout Action - Relatório", 14, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const dateStr = new Date(match.createdAt).toLocaleDateString("pt-BR")
  doc.text(`${match.teamName}  x  ${match.opponentName || "Adversário"}   ·   ${dateStr}`, 14, 20)

  // ---- Placar ----
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Sets: ${match.teamSets} x ${match.opponentSets}`, 14, 36)

  // ---- Tabela por atleta ----
  const body = stats.map((s) => [
    s.number,
    s.name || `Atleta ${s.number}`,
    s.tg,
    s.tp,
    s.te,
    `${s.tgp}%`,
  ])
  // Linha de total da equipe
  body.push(["", "EQUIPE", totals.tg, totals.tp, totals.te, `${totals.tgp}%`])

  autoTable(doc, {
    startY: 42,
    head: [["Nº", "NOME", "TG", "TP", "TE", "TGP"]],
    body,
    theme: "grid",
    styles: { fontSize: 9, halign: "center", cellPadding: 2.5 },
    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "left" },
    },
    didParseCell: (data) => {
      // Destaca a linha de total (última do corpo).
      if (data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fillColor = [255, 237, 213]
      }
    },
  })

  // ---- Legenda ----
  // @ts-expect-error jspdf-autotable estende doc em runtime
  const finalY = (doc.lastAutoTable?.finalY ?? 42) + 10
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 90)
  doc.text("TG = pontos feitos  ·  TP = participações (ações + pontos)  ·  TE = erros", 14, finalY)
  doc.text("TGP = índice de participação da planilha oficial", 14, finalY + 5)

  const safe = (match.teamName || "scout-action").replace(/[^\w.-]+/g, "_")
  doc.save(`scout-action-${safe}-${dateStr.replace(/\//g, "-")}.pdf`)
}
