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

export function exportToPDF(
  currentSessionPlays: Play[],
  teamNames: TeamNames,
  settersA: Setters,
  settersB: Setters,
  session?: Session,
) {
  const playsToExport = session ? session.plays : currentSessionPlays
  const sessionName = session ? session.name : `Sessão ${new Date().toLocaleDateString("pt-BR")}`
  const currentTeamNames = session ? session.teamNames : teamNames

  if (playsToExport.length === 0) {
    alert("Nenhuma jogada para exportar!")
    return
  }

  const exportStats = getStats(playsToExport)
  const statsA1 = getStatsBySetter(
    playsToExport.filter((p) => p.team === "A"),
    1,
  )
  const statsA2 = getStatsBySetter(
    playsToExport.filter((p) => p.team === "A"),
    2,
  )
  const statsB1 = getStatsBySetter(
    playsToExport.filter((p) => p.team === "B"),
    1,
  )
  const statsB2 = getStatsBySetter(
    playsToExport.filter((p) => p.team === "B"),
    2,
  )

  const sA = session ? session.settersA : settersA
  const sB = session ? session.settersB : settersB

  const createBar = (label: string, value: number, total: number, color: string) => {
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
    return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${label}</span><strong>${value} (${pct}%)</strong></div><div style="background:#e5e7eb;height:20px;border-radius:4px;overflow:hidden"><div style="background:${color};height:100%;width:${pct}%"></div></div></div>`
  }

  const createSetterSection = (team: Team, setterNum: number, stats: ReturnType<typeof getStats>) => {
    const setterName = getSetterName(team, setterNum, sA, sB)
    const total = stats.totals[team]
    if (total === 0) return ""
    return `<div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:8px">
      <h4 style="margin:0 0 10px;color:#475569">${setterName}</h4>
      <div style="font-size:12px;color:#64748b">Jogadas: ${total}</div>
      ${Object.entries(stats.positions[team])
        .map(([p, v]) => createBar(positionLabels[p as SetPosition] || p, v as number, total, "#1e40af"))
        .join("")}
    </div>`
  }

  // URL absoluta para a logo aparecer na janela de impressão (about:blank).
  const logoSrc =
    typeof window !== "undefined" ? `${window.location.origin}/volley-tech-logo.png` : "/volley-tech-logo.png"

  // Desenha uma quadra (plana, limpa) com as direções de UM local de ataque.
  const courtSvg = (group: PositionAttackGroup) => {
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

  const courtsSection = (team: Team) => {
    const groups = getAttackByPosition(playsToExport, team)
    if (groups.length === 0) return ""
    return `<h3 style="margin-top:18px">Direções de Ataque por Local</h3>
      <p style="font-size:12px;color:#6b7280;margin:0 0 10px">Uma quadra por local de origem, para leitura individual de cada posição.</p>
      <div class="courts-grid">${groups.map(courtSvg).join("")}</div>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${sessionName}</title><style>*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto}h1{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:10px}h2{color:#374151;margin-top:25px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{border:1px solid #d1d5db;padding:15px;border-radius:8px}.summary{display:flex;gap:20px;margin:20px 0}.summary-item{flex:1;text-align:center;padding:15px;background:#f3f4f6;border-radius:8px}.summary-value{font-size:28px;font-weight:bold;color:#1e40af}.courts-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}svg{page-break-inside:avoid;break-inside:avoid}@media print{.courts-grid{grid-template-columns:1fr 1fr}}</style></head><body>
<div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #f97316;padding-bottom:10px;margin-bottom:8px">
  <img src="${logoSrc}" alt="Volley Tech" style="width:44px;height:44px;object-fit:contain" />
  <div>
    <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#f97316">VOLLEY TECH · ATTACK POSITION</div>
    <h1 style="border:none;padding:0;margin:2px 0 0">RELATÓRIO: ${sessionName}</h1>
  </div>
</div>
<p style="color:#6b7280">${session ? new Date(session.date).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}</p>
<div class="summary"><div class="summary-item"><div class="summary-value">${playsToExport.length}</div><div>Total</div></div><div class="summary-item"><div class="summary-value">${exportStats.totals.A}</div><div>${currentTeamNames.A}</div></div><div class="summary-item"><div class="summary-value">${exportStats.totals.B}</div><div>${currentTeamNames.B}</div></div></div>
<div class="grid">
<div class="card"><h2>${currentTeamNames.A}</h2><h3>Levantamento</h3>${Object.entries(exportStats.positions.A)
    .map(([p, v]) => createBar(positionLabels[p as SetPosition] || p, v as number, exportStats.totals.A, "#1e40af"))
    .join("")}
${createSetterSection("A", 1, statsA1)}${createSetterSection("A", 2, statsA2)}
<h3>Ataques</h3>${Object.entries(exportStats.attacks.A)
    .map(([a, v]) => createBar(attackTypeLabels[a as AttackType] || a, v as number, exportStats.totals.A, "#6b7280"))
    .join("")}<h3>Resultados</h3>${createBar("Ponto", exportStats.results.A.ponto, exportStats.totals.A, "#10b981")}${createBar("Certo", exportStats.results.A.certo, exportStats.totals.A, "#3b82f6")}${createBar("Erro", exportStats.results.A.erro, exportStats.totals.A, "#ef4444")}${createBar("Bloqueado", exportStats.results.A.bloqueado, exportStats.totals.A, "#f97316")}</div>
<div class="card"><h2>${currentTeamNames.B}</h2><h3>Levantamento</h3>${Object.entries(exportStats.positions.B)
    .map(([p, v]) => createBar(positionLabels[p as SetPosition] || p, v as number, exportStats.totals.B, "#1e40af"))
    .join("")}
${createSetterSection("B", 1, statsB1)}${createSetterSection("B", 2, statsB2)}
<h3>Ataques</h3>${Object.entries(exportStats.attacks.B)
    .map(([a, v]) => createBar(attackTypeLabels[a as AttackType] || a, v as number, exportStats.totals.B, "#6b7280"))
    .join("")}<h3>Resultados</h3>${createBar("Ponto", exportStats.results.B.ponto, exportStats.totals.B, "#10b981")}${createBar("Certo", exportStats.results.B.certo, exportStats.totals.B, "#3b82f6")}${createBar("Erro", exportStats.results.B.erro, exportStats.totals.B, "#ef4444")}${createBar("Bloqueado", exportStats.results.B.bloqueado, exportStats.totals.B, "#f97316")}</div>
</div>
<div style="margin-top:24px"><h2 style="color:#1e40af">${currentTeamNames.A} — Ataques por Local</h2>${courtsSection("A")}</div>
<div style="margin-top:24px"><h2 style="color:#ef4444">${currentTeamNames.B} — Ataques por Local</h2>${courtsSection("B")}</div>
</body></html>`

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
