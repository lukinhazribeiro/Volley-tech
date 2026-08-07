/**
 * Volley Hub — relatório PDF vetorial da atleta (IPTV, evolução, avaliação
 * inteligente e linha do tempo). Mesmo estilo de documento do Scout View.
 */

import { FUNDAMENTALS, FUNDAMENTAL_LABELS, successRate } from "./stats"
import { computeIPTV, generateEvaluation } from "./intelligence"
import { buildChapters } from "./aggregate"
import { computeIGD, igdLabel } from "./igd"
import type { PhysicalAssessment } from "./physical"
import type { HubAthlete, HubHistoryEntry } from "./types"

/** Dados extras opcionais para enriquecer o relatório (índices + cadastro). */
export interface AthletePdfExtras {
  assessments?: PhysicalAssessment[]
  gestao?: {
    nome: string
    categoria: string | null
    turma: string | null
    dataNascimento: string | null
  } | null
}

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

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

const C = {
  orange: rgb("#ea580c"),
  ink: rgb("#0f172a"),
  slate700: rgb("#334155"),
  slate500: rgb("#64748b"),
  slate400: rgb("#94a3b8"),
  slate200: rgb("#e2e8f0"),
  slate100: rgb("#f1f5f9"),
  slate50: rgb("#f8fafc"),
  white: rgb("#ffffff"),
  blue: rgb("#2563eb"),
  emerald: rgb("#16a34a"),
  red: rgb("#dc2626"),
  amber: rgb("#f59e0b"),
}

export async function exportAthletePdf(
  athlete: HubAthlete,
  entries: HubHistoryEntry[],
  extras: AthletePdfExtras = {},
) {
  const { jsPDF } = await import("jspdf")
  const chapters = buildChapters(entries)
  const igd = computeIGD(entries, extras.assessments ?? [])
  const overall = chapters.reduce(
    (acc, c) => {
      for (const f of FUNDAMENTALS) {
        acc[f].certo += c.fundamentals[f].certo
        acc[f].erro += c.fundamentals[f].erro
        acc[f].ponto += c.fundamentals[f].ponto
        acc[f].total += c.fundamentals[f].total
      }
      return acc
    },
    {
      ataque: { certo: 0, erro: 0, ponto: 0, total: 0 },
      recepcao: { certo: 0, erro: 0, ponto: 0, total: 0 },
      defesa: { certo: 0, erro: 0, ponto: 0, total: 0 },
      bloqueio: { certo: 0, erro: 0, ponto: 0, total: 0 },
      saque: { certo: 0, erro: 0, ponto: 0, total: 0 },
    },
  )

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

  // -------- Cabeçalho --------
  const logoData = await loadLogoDataUrl()
  const headerH = 76
  doc.setFillColor(...C.ink)
  doc.roundedRect(M, y, CW, headerH, 8, 8, "F")
  doc.setFillColor(...C.orange)
  doc.roundedRect(M, y, 6, headerH, 3, 3, "F")
  doc.rect(M + 3, y, 4, headerH, "F")

  const logoSize = 46
  let textX = M + 22
  if (logoData) {
    doc.addImage(logoData, "PNG", M + 18, y + (headerH - logoSize) / 2, logoSize, logoSize)
    textX = M + 18 + logoSize + 14
  }
  doc.setTextColor(...C.orange)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("VOLLEY TECH  ·  INTELIGÊNCIA ESPORTIVA", textX, y + 22)
  doc.setTextColor(...C.white)
  doc.setFontSize(20)
  doc.text("Perfil da Atleta", textX, y + 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(226, 232, 240)
  doc.text(athlete.full_name, textX, y + 64)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    [athlete.team, athlete.category, athlete.position].filter(Boolean).join(" · ") || "—",
    M + CW - 14,
    y + 30,
    { align: "right" },
  )
  doc.text(`Gerado em ${dateLabel}`, M + CW - 14, y + 46, { align: "right" })
  y += headerH + 20

  // -------- Cadastro (Gestão) — quando a atleta está vinculada --------
  if (extras.gestao) {
    const g = extras.gestao
    const nasc = g.dataNascimento ? new Date(g.dataNascimento).toLocaleDateString("pt-BR") : null
    const cad = [
      g.categoria ? `Categoria: ${g.categoria}` : null,
      g.turma ? `Turma: ${g.turma}` : null,
      nasc ? `Nascimento: ${nasc}` : null,
    ]
      .filter(Boolean)
      .join("    ")
    if (cad) {
      doc.setFillColor(...C.slate50)
      doc.setDrawColor(...C.slate200)
      doc.setLineWidth(0.8)
      doc.roundedRect(M, y, CW, 30, 6, 6, "FD")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(7.5)
      doc.setTextColor(...C.orange)
      doc.text("CADASTRO (GESTÃO)", M + 12, y + 12)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(...C.slate700)
      doc.text(cad, M + 12, y + 24)
      y += 30 + 16
    }
  }

  // -------- KPIs (índices consolidados) --------
  const iptv = computeIPTV(overall)
  const fmt = (n: number | null, suffix = "") => (n != null ? `${n}${suffix}` : "—")
  const kpis: { label: string; value: string; accent: [number, number, number] }[] = [
    { label: "IPTV", value: fmt(igd.iptv ?? iptv), accent: C.orange },
    { label: "IPF", value: fmt(igd.ipf), accent: C.blue },
    { label: "Último TGP", value: fmt(igd.tgp, "%"), accent: C.emerald },
    { label: `IGD · ${igdLabel(igd.igd)}`, value: fmt(igd.igd), accent: C.amber },
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
    doc.setFillColor(...k.accent)
    doc.roundedRect(kx, y, kpiW, 4, 2, 2, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...C.slate500)
    doc.text(k.label, kx + 14, y + 25)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(k.value.length > 6 ? 12 : 20)
    doc.setTextColor(...C.ink)
    doc.text(k.value, kx + 14, y + 50)
  })
  y += kpiH + 24

  // -------- Fundamentos (barras) --------
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...C.slate400)
  doc.text("APROVEITAMENTO POR FUNDAMENTO", M, y)
  y += 14

  const labelW = 90
  const valueW = 34
  const barX = M + labelW
  const barMaxW = CW - labelW - valueW
  for (const f of FUNDAMENTALS) {
    const val = successRate(overall[f])
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...C.slate700)
    doc.text(FUNDAMENTAL_LABELS[f], M, y + 3)
    doc.setFillColor(...C.slate100)
    doc.roundedRect(barX, y - 6, barMaxW, 11, 3, 3, "F")
    doc.setFillColor(...C.orange)
    doc.roundedRect(barX, y - 6, Math.max(3, (val / 100) * barMaxW), 11, 3, 3, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...C.ink)
    doc.text(`${val}%`, M + CW, y + 3, { align: "right" })
    y += 20
  }
  y += 10

  // -------- Avaliação Inteligente --------
  if (y + 80 > pageH - M) {
    doc.addPage()
    y = M
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...C.slate400)
  doc.text("AVALIAÇÃO INTELIGENTE", M, y)
  y += 8

  const evalText =
    chapters.length > 0
      ? generateEvaluation({
          athleteName: athlete.full_name,
          position: athlete.position || "",
          current: chapters[chapters.length - 1].fundamentals,
          previous: chapters.length > 1 ? chapters[chapters.length - 2].fundamentals : undefined,
        })
      : "Ainda não há dados suficientes para gerar a avaliação."
  doc.setFillColor(...C.slate50)
  doc.setDrawColor(...C.slate200)
  const lines = doc.splitTextToSize(evalText, CW - 24)
  const boxH = 16 + lines.length * 12
  doc.roundedRect(M, y + 4, CW, boxH, 7, 7, "FD")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...C.slate700)
  doc.text(lines, M + 12, y + 20)
  y += boxH + 24

  // -------- Linha do tempo (tabela simples) --------
  if (chapters.length > 0) {
    if (y + 60 > pageH - M) {
      doc.addPage()
      y = M
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...C.slate400)
    doc.text("LINHA DO TEMPO", M, y)
    y += 16

    for (const c of chapters) {
      if (y + 26 > pageH - M) {
        doc.addPage()
        y = M
      }
      doc.setFillColor(...C.white)
      doc.setDrawColor(...C.slate200)
      doc.roundedRect(M, y, CW, 24, 5, 5, "FD")
      doc.setFillColor(...C.orange)
      doc.circle(M + 12, y + 12, 3, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8.5)
      doc.setTextColor(...C.ink)
      doc.text(`${c.competition || "Competição"} · ${c.season || "—"}`, M + 22, y + 15)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...C.slate500)
      doc.text(`IPTV ${c.iptv}`, M + CW - 12, y + 15, { align: "right" })
      y += 30
    }
  }

  // -------- Rodapé --------
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
    doc.text("Volley Tech · Inteligência Esportiva", footTextX, pageH - 16)
    doc.text(`Página ${p} de ${pageCount}`, pageW - M, pageH - 16, { align: "right" })
  }

  const safe = athlete.full_name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "atleta"
  doc.save(`volley-tech-${safe}.pdf`)
}

