import {
  type Play,
  type Session,
  type Team,
  type SetPosition,
  type AttackType,
  type Setters,
  type TeamNames,
  getStats,
  getStatsBySetter,
  getSetterName,
  positionLabels,
  attackTypeLabels,
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

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${sessionName}</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto}h1{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:10px}h2{color:#374151;margin-top:25px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{border:1px solid #d1d5db;padding:15px;border-radius:8px}.summary{display:flex;gap:20px;margin:20px 0}.summary-item{flex:1;text-align:center;padding:15px;background:#f3f4f6;border-radius:8px}.summary-value{font-size:28px;font-weight:bold;color:#1e40af}</style></head><body>
<h1>RELATÓRIO: ${sessionName}</h1>
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
</div></body></html>`

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onload = () => win.print()
  }
}
