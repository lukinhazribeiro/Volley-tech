import {
  type Play,
  type Session,
  type Team,
  type SetPosition,
  type AttackType,
  type Setters,
  type TeamNames,
  type PositionAttackGroup,
  getStats,
  getStatsBySetter,
  getSetterName,
  getAttackByPosition,
  positionLabels,
  attackTypeLabels,
  attackLineColors,
} from "./volley-stats"

/** Estilos do relatório oficial, escopados sob `.vt-report` para poder ser
 *  injetado com segurança na aplicação (sem conflitar com utilitários do Tailwind). */
const REPORT_SCOPED_STYLES = `
.vt-report{font-family:Arial,sans-serif;color:#111827}
.vt-report h1{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:10px;font-size:22px;margin:0}
.vt-report h2{color:#374151;margin-top:25px}
.vt-report h3{color:#374151}
.vt-report .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.vt-report .card{border:1px solid #d1d5db;padding:15px;border-radius:8px}
.vt-report .summary{display:flex;gap:20px;margin:20px 0;flex-wrap:wrap}
.vt-report .summary-item{flex:1;min-width:120px;text-align:center;padding:15px;background:#f3f4f6;border-radius:8px}
.vt-report .summary-value{font-size:28px;font-weight:bold;color:#1e40af}
.vt-report .courts-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.vt-report svg{page-break-inside:avoid;break-inside:avoid}
@media (max-width:640px){.vt-report .grid,.vt-report .courts-grid{grid-template-columns:1fr}}
`

/** URL absoluta para a logo aparecer também na janela de impressão (about:blank). */
function getLogoSrc(): string {
  return typeof window !== "undefined" ? `${window.location.origin}/volley-tech-logo.png` : "/volley-tech-logo.png"
}

/** Cabeçalho padrão da marca, comum a todos os relatórios. */
function reportHeader(title: string, dateStr: string): string {
  return `
<div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #f97316;padding-bottom:10px;margin-bottom:8px">
  <img src="${getLogoSrc()}" alt="Volley Tech" style="width:44px;height:44px;object-fit:contain" />
  <div>
    <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#f97316">VOLLEY TECH · ATTACK POSITION</div>
    <h1 style="border:none;padding:0;margin:2px 0 0">${title}</h1>
  </div>
</div>
<p style="color:#6b7280">${dateStr}</p>`
}

function renderBar(label: string, value: number, total: number, color: string): string {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
  return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${label}</span><strong>${value} (${pct}%)</strong></div><div style="background:#e5e7eb;height:20px;border-radius:4px;overflow:hidden"><div style="background:${color};height:100%;width:${pct}%"></div></div></div>`
}

/** Desenha uma quadra (plana, limpa) com as direções de UM local de ataque. */
function renderCourtSvg(group: PositionAttackGroup): string {
  const lines = group.lines
    .map((l) => {
      const color = attackLineColors[l.attackType] ?? "#f97316"
      const midX = (l.line.startX + l.line.endX) / 2
      const midY = (l.line.startY + 20 + l.line.endY) / 2
      const w = Math.max(2.5, l.percentage / 9)
      return `<line x1="${l.line.startX}" y1="${l.line.startY + 20}" x2="${l.line.endX}" y2="${l.line.endY}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="0.9" />
        <circle cx="${midX}" cy="${midY}" r="11" fill="${color}" />
        <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">${l.percentage}%</text>`
    })
    .join("")

  const legend = group.lines
    .map(
      (l) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:10px;margin:2px"><span style="width:8px;height:8px;border-radius:50%;background:${attackLineColors[l.attackType] ?? "#f97316"}"></span>${attackTypeLabels[l.attackType] ?? l.attackType}: <strong>${l.count} (${l.percentage}%)</strong></span>`,
    )
    .join("")

  return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff;break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <strong style="color:#1e293b;font-size:13px">${group.label} <span style="color:#94a3b8;font-weight:normal">(${group.description})</span></strong>
        <span style="font-size:11px;color:#f97316;font-weight:bold">${group.total} ataques</span>
      </div>
      <svg viewBox="0 0 200 220" width="190" height="209" preserveAspectRatio="xMidYMid meet" style="width:190px;height:209px;max-width:100%;display:block;margin:0 auto">
        <rect x="5" y="5" width="190" height="210" fill="#f5f0dc" stroke="#1e3a5f" stroke-width="3" rx="2" />
        <rect x="5" y="20" width="190" height="10" fill="#1e3a5f" />
        <text x="100" y="15" text-anchor="middle" font-size="9" fill="#1e3a5f" font-weight="bold">REDE</text>
        <circle cx="20" cy="25" r="9" fill="#1e40af" /><text x="20" y="28.5" text-anchor="middle" font-size="8" fill="#fff" font-weight="bold">P2</text>
        <circle cx="100" cy="25" r="9" fill="#1e40af" /><text x="100" y="28.5" text-anchor="middle" font-size="8" fill="#fff" font-weight="bold">P3</text>
        <circle cx="180" cy="25" r="9" fill="#1e40af" /><text x="180" y="28.5" text-anchor="middle" font-size="8" fill="#fff" font-weight="bold">P4</text>
        <line x1="5" y1="75" x2="195" y2="75" stroke="#1e3a5f" stroke-width="1.5" stroke-dasharray="8,4" />
        <circle cx="20" cy="190" r="6" fill="#94a3b8" opacity="0.5" /><text x="20" y="193" text-anchor="middle" font-size="7" fill="#1e3a5f" font-weight="bold">P5</text>
        <circle cx="100" cy="190" r="6" fill="#94a3b8" opacity="0.5" /><text x="100" y="193" text-anchor="middle" font-size="7" fill="#1e3a5f" font-weight="bold">P6</text>
        <circle cx="180" cy="190" r="6" fill="#94a3b8" opacity="0.5" /><text x="180" y="193" text-anchor="middle" font-size="7" fill="#1e3a5f" font-weight="bold">P1</text>
        ${lines}
      </svg>
      <div style="text-align:center;margin-top:6px">${legend}</div>
    </div>`
}

/** Seção "Direções de Ataque por Local" para um conjunto de jogadas de UMA equipe. */
function renderCourtsSection(plays: Play[], team: Team): string {
  const groups = getAttackByPosition(plays, team)
  if (groups.length === 0) return ""
  return `<h3 style="margin-top:18px">Direções de Ataque por Local</h3>
      <p style="font-size:12px;color:#6b7280;margin:0 0 10px">Uma quadra por local de origem, para leitura individual de cada posição.</p>
      <div class="courts-grid">${groups.map(renderCourtSvg).join("")}</div>`
}

export interface ReportInput {
  currentSessionPlays: Play[]
  teamNames: TeamNames
  settersA: Setters
  settersB: Setters
  session?: Session
  /** Quais equipes incluir no documento. Padrão: ambas. */
  teams?: Team[]
}

/**
 * Monta o conteúdo do relatório OFICIAL (o mesmo do PDF). Retorna o HTML interno
 * (sem <html>/<body>) já com a `<style>` escopada, para ser reaproveitado tanto na
 * exportação em PDF quanto na visualização "Ver" do histórico — garantindo que os
 * dois sejam idênticos. O parâmetro `teams` permite emitir com ambas as equipes ou
 * apenas uma.
 */
export function buildAttackReportHTML({
  currentSessionPlays,
  teamNames,
  settersA,
  settersB,
  session,
  teams = ["A", "B"],
}: ReportInput): { html: string; sessionName: string; isEmpty: boolean } {
  const playsToExport = session ? session.plays : currentSessionPlays
  const sessionName = session ? session.name : `Sessão ${new Date().toLocaleDateString("pt-BR")}`
  const currentTeamNames = session ? session.teamNames : teamNames

  if (playsToExport.length === 0) {
    return { html: "", sessionName, isEmpty: true }
  }

  const includeTeams = teams.length > 0 ? teams : (["A", "B"] as Team[])
  const exportStats = getStats(playsToExport)
  const sA = session ? session.settersA : settersA
  const sB = session ? session.settersB : settersB

  const createSetterSection = (team: Team, setterNum: number, stats: ReturnType<typeof getStats>) => {
    const setterName = getSetterName(team, setterNum, sA, sB)
    const total = stats.totals[team]
    if (total === 0) return ""
    return `<div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:8px">
      <h4 style="margin:0 0 10px;color:#475569">${setterName}</h4>
      <div style="font-size:12px;color:#64748b">Jogadas: ${total}</div>
      ${Object.entries(stats.positions[team])
        .map(([p, v]) => renderBar(positionLabels[p as SetPosition] || p, v as number, total, "#1e40af"))
        .join("")}
    </div>`
  }

  const teamCard = (team: Team) => {
    const statsS1 = getStatsBySetter(
      playsToExport.filter((p) => p.team === team),
      1,
    )
    const statsS2 = getStatsBySetter(
      playsToExport.filter((p) => p.team === team),
      2,
    )
    return `<div class="card"><h2>${currentTeamNames[team]}</h2><h3>Levantamento</h3>${Object.entries(exportStats.positions[team])
      .map(([p, v]) => renderBar(positionLabels[p as SetPosition] || p, v as number, exportStats.totals[team], "#1e40af"))
      .join("")}
${createSetterSection(team, 1, statsS1)}${createSetterSection(team, 2, statsS2)}
<h3>Ataques</h3>${Object.entries(exportStats.attacks[team])
      .map(([a, v]) => renderBar(attackTypeLabels[a as AttackType] || a, v as number, exportStats.totals[team], "#6b7280"))
      .join("")}<h3>Resultados</h3>${renderBar("Ponto", exportStats.results[team].ponto, exportStats.totals[team], "#10b981")}${renderBar("Certo", exportStats.results[team].certo, exportStats.totals[team], "#3b82f6")}${renderBar("Erro", exportStats.results[team].erro, exportStats.totals[team], "#ef4444")}${renderBar("Bloqueado", exportStats.results[team].bloqueado, exportStats.totals[team], "#f97316")}</div>`
  }

  const summaryItems = [
    `<div class="summary-item"><div class="summary-value">${includeTeams.reduce((s, t) => s + exportStats.totals[t], 0)}</div><div>Total</div></div>`,
    ...includeTeams.map(
      (t) => `<div class="summary-item"><div class="summary-value">${exportStats.totals[t]}</div><div>${currentTeamNames[t]}</div></div>`,
    ),
  ].join("")

  const cards = includeTeams.map(teamCard).join("")
  const cardsWrapper = includeTeams.length === 1 ? `<div>${cards}</div>` : `<div class="grid">${cards}</div>`

  const courtsBlocks = includeTeams
    .map(
      (t) =>
        `<div style="margin-top:24px"><h2 style="color:${t === "A" ? "#1e40af" : "#ef4444"}">${currentTeamNames[t]} — Ataques por Local</h2>${renderCourtsSection(playsToExport, t)}</div>`,
    )
    .join("")

  const teamsSuffix = includeTeams.length === 1 ? ` — ${currentTeamNames[includeTeams[0]]}` : ""

  const body = `
${reportHeader(`RELATÓRIO: ${sessionName}${teamsSuffix}`, session ? new Date(session.date).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR"))}
<div class="summary">${summaryItems}</div>
${cardsWrapper}
${courtsBlocks}`

  return {
    html: `<style>${REPORT_SCOPED_STYLES}</style><div class="vt-report">${body}</div>`,
    sessionName: `${sessionName}${teamsSuffix}`,
    isEmpty: false,
  }
}

export interface AggregateReportInput {
  /** Título principal (nome da equipe ou da levantadora). */
  title: string
  /** Rótulo do tipo de entidade, ex: "Equipe" ou "Levantadora". */
  kind: string
  /** Linha de contexto, ex: "Consolidado de 3 jogos". */
  subtitle?: string
  /** Jogadas de levantamento já filtradas para esta entidade (tags de equipe variadas). */
  plays: Play[]
  /** Chips extras opcionais para o resumo. */
  chips?: { label: string; value: string | number }[]
}

/**
 * Monta um relatório AGREGADO (por equipe ou por levantadora), inspirado no modelo
 * oficial: cabeçalho da marca, resumo, distribuição de levantamentos/ataques/resultados
 * e as quadras de direção de ataque por local. As jogadas podem vir de equipes A/B
 * diferentes ao longo dos jogos, por isso são normalizadas para uma única equipe.
 */
export function buildAggregateAttackReportHTML({
  title,
  kind,
  subtitle,
  plays,
  chips = [],
}: AggregateReportInput): { html: string; isEmpty: boolean } {
  const lifts = plays.filter((p) => p.status === "levantamento")
  if (lifts.length === 0) return { html: "", isEmpty: true }

  // Normaliza todas as jogadas para a equipe "A" para reaproveitar as funções de estatística/quadra.
  const norm: Play[] = lifts.map((p) => ({ ...p, team: "A" as Team }))
  const stats = getStats(norm)
  const total = stats.totals.A

  const summaryItems = [
    `<div class="summary-item"><div class="summary-value">${total}</div><div>Levantamentos</div></div>`,
    `<div class="summary-item"><div class="summary-value">${stats.results.A.ponto}</div><div>Pontos</div></div>`,
    `<div class="summary-item"><div class="summary-value">${stats.results.A.certo}</div><div>Certos</div></div>`,
    `<div class="summary-item"><div class="summary-value">${stats.results.A.erro}</div><div>Erros</div></div>`,
    ...chips.map((c) => `<div class="summary-item"><div class="summary-value">${c.value}</div><div>${c.label}</div></div>`),
  ].join("")

  const body = `
${reportHeader(`${kind.toUpperCase()}: ${title}`, subtitle ? subtitle : new Date().toLocaleString("pt-BR"))}
<div class="summary">${summaryItems}</div>
<div class="card"><h3>Levantamento por Posição</h3>${Object.entries(stats.positions.A)
    .map(([p, v]) => renderBar(positionLabels[p as SetPosition] || p, v as number, total, "#1e40af"))
    .join("")}
<h3>Tipos de Ataque</h3>${Object.entries(stats.attacks.A)
    .map(([a, v]) => renderBar(attackTypeLabels[a as AttackType] || a, v as number, total, "#6b7280"))
    .join("")}
<h3>Resultados</h3>${renderBar("Ponto", stats.results.A.ponto, total, "#10b981")}${renderBar("Certo", stats.results.A.certo, total, "#3b82f6")}${renderBar("Erro", stats.results.A.erro, total, "#ef4444")}${renderBar("Bloqueado", stats.results.A.bloqueado, total, "#f97316")}</div>
<div style="margin-top:24px"><h2 style="color:#f97316">Ataques por Local</h2>${renderCourtsSection(norm, "A")}</div>`

  return {
    html: `<style>${REPORT_SCOPED_STYLES}</style><div class="vt-report">${body}</div>`,
    isEmpty: false,
  }
}

/** Abre uma janela com o HTML do relatório e dispara a impressão (PDF). */
function printReportHTML(innerHtml: string, title: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{padding:30px;max-width:900px;margin:0 auto}@media print{.vt-report .courts-grid{grid-template-columns:1fr 1fr}}</style></head><body>${innerHtml}</body></html>`

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onload = () => {
      // Aguarda as imagens (logo) carregarem para não imprimir com conteúdo faltando.
      const imgs = Array.from(win.document.images)
      const pending = imgs.filter((img) => !img.complete)
      let done = false
      const doPrint = () => {
        if (done) return
        done = true
        win.focus()
        win.print()
      }
      if (pending.length === 0) {
        doPrint()
      } else {
        let loaded = 0
        pending.forEach((img) => {
          const finish = () => {
            loaded += 1
            if (loaded >= pending.length) doPrint()
          }
          img.addEventListener("load", finish)
          img.addEventListener("error", finish)
        })
      }
      // Segurança: imprime mesmo que algum recurso demore.
      win.setTimeout(doPrint, 1200)
    }
  }
}

export function exportToPDF(
  currentSessionPlays: Play[],
  teamNames: TeamNames,
  settersA: Setters,
  settersB: Setters,
  session?: Session,
  teams: Team[] = ["A", "B"],
) {
  const report = buildAttackReportHTML({ currentSessionPlays, teamNames, settersA, settersB, session, teams })
  if (report.isEmpty) {
    alert("Nenhuma jogada para exportar!")
    return
  }
  printReportHTML(report.html, report.sessionName)
}

/** Exporta o relatório agregado (equipe ou levantadora) como PDF. */
export function exportAggregateToPDF(input: AggregateReportInput) {
  const report = buildAggregateAttackReportHTML(input)
  if (report.isEmpty) {
    alert("Nenhuma jogada para exportar!")
    return
  }
  printReportHTML(report.html, `${input.kind}: ${input.title}`)
}
