import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { computePlayerMetrics, type ScoutActionMatch } from "./types"

/**
 * Gera um PDF do Scout Action no mesmo padrão dos demais relatórios:
 * cabeçalho com identificação da partida e tabela por atleta com TG / TP / TE / TGP.
 */
export function exportActionMatchPdf(match: ScoutActionMatch) {
  const doc = new jsPDF({ orientation: "landscape" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Cabeçalho
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Scout Action — Relatório da Partida", 14, 16)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const info = [
    `Equipe: ${match.teamAName}`,
    match.teamBName ? `Adversário: ${match.teamBName}` : null,
    match.category ? `Categoria: ${match.category}` : null,
    match.completedAt ? `Data: ${new Date(match.completedAt).toLocaleDateString("pt-BR")}` : null,
  ]
    .filter(Boolean)
    .join("   |   ")
  doc.text(info, 14, 23)

  if (match.sets.length > 0) {
    const setsLine = `Sets: ${match.sets
      .map((s, i) => `${i + 1}º ${s.scoreA}x${s.scoreB}`)
      .join("   ")}`
    doc.text(setsLine, 14, 29)
  }

  // Tabela por atleta (fórmula única de TGP)
  const rows = match.teamAPlayers
    .map((p) => {
      const m = computePlayerMetrics(match.events, "A", p.number)
      return { num: p.number, name: p.name, role: p.role, ...m }
    })
    .sort((a, b) => b.tgp - a.tgp)

  autoTable(doc, {
    startY: 35,
    head: [["#", "Atleta", "Função", "TG", "TP", "TE", "TGP %", "IPTV"]],
    body: rows.map((r) => [
      String(r.num),
      r.name,
      r.role,
      String(r.tg),
      String(r.tp),
      String(r.te),
      `${r.tgp}%`,
      String(r.iptv),
    ]),
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [8, 145, 178], textColor: 255, halign: "center" },
    columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
    theme: "grid",
  })

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    "TGP calculado pela fórmula única do Volley Tech (TP, TE, TG). PONTO conta como participação (TP) e como ponto (TG); AÇÃO conta como participação (TP); ERRO conta como erro (TE). IPTV bruto = TP/(TP+TE).",
    14,
    pageH - 8,
    { maxWidth: pageW - 28 },
  )

  const safe = `${match.teamAName}_scout_action`.replace(/[^a-z0-9]+/gi, "_")
  doc.save(`${safe}.pdf`)
}
