import fs from "node:fs"
let capturedHtml = ""
const { exportToPDF } = await import("./lib/attack/export-pdf.ts")
;(globalThis as any).window = { location: { origin: "http://localhost:3000" }, open: () => ({ onload: null, print: () => {} }) }
;(URL as any).createObjectURL = () => "blob:x"
;(URL as any).revokeObjectURL = () => {}
;(globalThis as any).Blob = class { constructor(parts: any[]) { capturedHtml = parts.join("") } }
;(globalThis as any).alert = (m: string) => console.log("ALERT:", m)
const positions = ["ponta","meio","oposto","fundo1"]
const types = ["diagonal_maior","diagonal_menor","paralela","paragonal","pingo"]
const plays: any[] = []
let id=1
for(let i=0;i<50;i++){ plays.push({ id:id++, team: i%2===0?"A":"B", status:"levantamento", position: positions[i%positions.length], attackType: types[i%types.length], result:"ponto", setter:1, timestamp:new Date() }) }
exportToPDF(plays, {A:"Equipe A",B:"Equipe B"}, {setter1:"L1",setter2:"L2"} as any, {setter1:"L1",setter2:"L2"} as any)
const hasCourts = capturedHtml.includes("Direções de Ataque por Local")
const svgCount = (capturedHtml.match(/<svg/g)||[]).length
console.log("HTML length:", capturedHtml.length, "| tem seção quadras:", hasCourts, "| nº de <svg>:", svgCount)
fs.writeFileSync("public/exptest.html", capturedHtml)
