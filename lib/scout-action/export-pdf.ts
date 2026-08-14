import type { ActionMatch, ActionSide } from "./types"
import { computeMatchStats, matchTotals } from "./types"

/**
 * Relatório PDF do Scout Action — mesmo padrão visual dos outros relatórios
 * (jsPDF + autotable), enxuto: só TG / TP / TE / TGP por atleta. Uma seção
 * por equipe (A e B), pois as duas são coletadas em detalhe.
 */
export async function exportActionMatchPdf(match: ActionMatch) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const nameA = match.teamA.name || "Equipe A"
  const nameB = match.teamB.name || "Equipe B"
  const dateStr = new Date(match.createdAt).toLocaleDateString("pt-BR")

  // ---- Cabeçalho ----
  doc.setFillColor(234, 88, 12) // laranja Volley Tech
  doc.rect(0, 0, 210, 26, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Scout Action - Relatório", 14, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const comp = match.competition?.trim() ? `${match.competition}   ·   ` : ""
  doc.text(`${nameA}  x  ${nameB}   ·   ${comp}${dateStr}`, 14, 20)

  // ---- Placar ----
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Sets: ${match.setsA} x ${match.setsB}`, 14, 36)

  let startY = 42

  const renderTeam = (side: ActionSide, teamName: string) => {
    const stats = computeMatchStats(match, side)
      .filter((s) => s.t > 0 || s.name?.trim())
      .sort((a, b) => b.tgp - a.tgp)
    const totals = matchTotals(match, side)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(234, 88, 12)
    doc.text(`Equipe ${side} — ${teamName}`, 14, startY)
    startY += 3

    const body = stats.map((s) => [
      s.number,
      s.name || `Atleta ${s.number}`,
      s.position || "-",
      s.tg,
      s.tp,
      s.te,
      `${s.tgp}%`,
    ])
    body.push(["", "EQUIPE", "", totals.tg, totals.tp, totals.te, `${totals.tgp}%`])

    autoTable(doc, {
      startY: startY + 1,
      head: [["Nº", "NOME", "POS", "TG", "TP", "TE", "TGP"]],
      body,
      theme: "grid",
      styles: { fontSize: 9, halign: "center", cellPadding: 2.5 },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.fillColor = [255, 237, 213]
        }
      },
    })
    // @ts-expect-error jspdf-autotable estende doc em runtime
    startY = (doc.lastAutoTable?.finalY ?? startY) + 10
  }

  renderTeam("A", nameA)
  renderTeam("B", nameB)

  // ---- Legenda ----
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 90)
  doc.text("TG = pontos feitos  ·  TP = participações (ações + pontos)  ·  TE = erros", 14, startY)
  doc.text("TGP = índice de participação (mesma fórmula da planilha oficial)", 14, startY + 5)

  const safe = `${nameA}-x-${nameB}`.replace(/[^\w.-]+/g, "_")
  doc.save(`scout-action-${safe}-${dateStr.replace(/\//g, "-")}.pdf`)
}
