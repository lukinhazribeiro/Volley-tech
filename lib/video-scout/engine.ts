// Motor de análise REAL por vídeo.
// Extrai frames no navegador, envia ao modelo de visão (rota /api/scout/analyze)
// e converte a resposta no formato ScoutAnalysis usado pelo módulo.

import { extractFrames, type ExtractedFrame } from "./frames"
import type {
  Fundamento,
  Player,
  Rally,
  Resultado,
  ScoutAction,
  ScoutAnalysis,
  TeamSide,
} from "./types"

let idCounter = 0
function uid(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

/** Elenco de exemplo, usado quando o app não fornece um. */
export function createDefaultPlayers(): Player[] {
  const casa: Player[] = [
    { id: uid("p"), number: 1, name: "Atleta 1", team: "casa", posicao: "P1" },
    { id: uid("p"), number: 5, name: "Atleta 5", team: "casa", posicao: "P2" },
    { id: uid("p"), number: 7, name: "Atleta 7", team: "casa", posicao: "P3" },
    { id: uid("p"), number: 10, name: "Atleta 10", team: "casa", posicao: "P4" },
    { id: uid("p"), number: 12, name: "Atleta 12", team: "casa", posicao: "P5" },
    { id: uid("p"), number: 14, name: "Atleta 14", team: "casa", posicao: "P6" },
  ]
  const adversario: Player[] = [
    { id: uid("p"), number: 2, name: "Adv. 2", team: "adversario" },
    { id: uid("p"), number: 4, name: "Adv. 4", team: "adversario" },
    { id: uid("p"), number: 9, name: "Adv. 9", team: "adversario" },
  ]
  return [...casa, ...adversario]
}

/** Lê a duração do vídeo a partir do arquivo (para o modo demonstração). */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0
      URL.revokeObjectURL(url)
      resolve(d || 0)
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    v.src = url
  })
}

/**
 * Gera uma análise de DEMONSTRAÇÃO (gratuita, sem IA).
 * Cria uma sequência de jogadas coerente de voleibol para você testar a
 * interface inteira sem nenhum custo. Os dados são ilustrativos, não são
 * leitura real do vídeo.
 */
export async function buildDemoAnalysis({
  file,
  players = [],
  onProgress,
}: {
  file: File
  players?: Player[]
  onProgress?: (p: AnalyzeProgress) => void
}): Promise<ScoutAnalysis> {
  onProgress?.({ phase: "extracting", ratio: 0.3 })
  const duration = (await readVideoDuration(file)) || 60
  onProgress?.({ phase: "extracting", ratio: 1 })

  const roster = players.length > 0 ? players : createDefaultPlayers()
  const casa = roster.filter((p) => p.team === "casa")
  const adversario = roster.filter((p) => p.team === "adversario")
  const pick = (list: Player[], seed: number) =>
    list.length ? list[seed % list.length] : null

  onProgress?.({ phase: "analyzing", ratio: 0 })

  // Quantidade de rallies proporcional à duração (1 rally a cada ~8s).
  const rallyCount = Math.max(3, Math.min(12, Math.round(duration / 8)))
  const rallies: Rally[] = []
  const actions: ScoutAction[] = []

  const slot = duration / rallyCount
  for (let i = 0; i < rallyCount; i++) {
    const start = +(i * slot + 0.5).toFixed(2)
    const end = +(start + slot * 0.7).toFixed(2)
    // Alterna o lado que pontua, de forma determinística.
    const winner: TeamSide = i % 3 === 0 ? "adversario" : "casa"
    const rallyId = `rally_${i + 1}`
    rallies.push({ id: rallyId, index: i + 1, startTime: start, endTime: end, winner })

    // Sequência típica de um rally: saque -> recepção -> levantamento -> ataque -> (bloqueio/defesa) -> resultado.
    const span = end - start
    const sacador = pick(winner === "casa" ? adversario : casa, i)
    const receptor = pick(winner === "casa" ? casa : adversario, i + 1)
    const levantador = pick(winner === "casa" ? casa : adversario, i + 2)
    const atacante = pick(winner === "casa" ? casa : adversario, i + 3)
    const bloqueador = pick(winner === "casa" ? adversario : casa, i + 4)

    const defensor = pick(winner === "casa" ? casa : adversario, i + 5)

    // Rotaciona detalhes para os fundamentos que usam sub-classificação.
    const alvoLev = (["ponta", "meio", "oposto", "fundo", "segunda"] as const)[i % 5]
    const posBloq = (["ponta", "meio", "oposto"] as const)[i % 3]
    const tipoDef = (["ataque", "volume", "recuperacao"] as const)[i % 3]
    // O saque alterna entre em jogo, ace e erro de forma determinística.
    const resSaque: Resultado =
      i % 4 === 0 ? "ponto" : i % 5 === 0 ? "erro" : "continuidade"

    const seq: {
      off: number
      fund: Fundamento
      res: Resultado
      player: Player | null
      det?: string | null
    }[] = [
      { off: 0.05, fund: "saque", res: resSaque, player: sacador },
      { off: 0.2, fund: "recepcao", res: i % 6 === 0 ? "erro" : "continuidade", player: receptor },
      { off: 0.4, fund: "levantamento", res: "continuidade", player: levantador, det: alvoLev },
      { off: 0.55, fund: "defesa", res: "continuidade", player: defensor, det: tipoDef },
      { off: 0.7, fund: "bloqueio", res: "ponto", player: bloqueador, det: posBloq },
      { off: 0.9, fund: "ataque", res: i % 5 === 0 ? "erro" : "ponto", player: atacante },
    ]

    seq.forEach((s, j) => {
      actions.push({
        id: `act_${i + 1}_${j + 1}`,
        rallyId,
        timestamp: +(start + span * s.off).toFixed(2),
        fundamento: s.fund,
        resultado: s.res,
        playerId: s.player?.id ?? null,
        detalhe: s.det ?? null,
        confidence: 0.7,
        validated: false,
      })
    })

    onProgress?.({ phase: "analyzing", ratio: (i + 1) / rallyCount })
  }

  onProgress?.({ phase: "mapping", ratio: 1 })

  return {
    videoName: file.name,
    videoDuration: duration,
    rallies,
    actions: actions.sort((a, b) => a.timestamp - b.timestamp),
    players: roster,
  }
}

/** Resposta crua vinda da IA (espelha o schema da rota). */
interface AIAnalysis {
  rallies: { startTime: number; endTime: number; winner: TeamSide | null }[]
  actions: {
    timestamp: number
    fundamento: Fundamento
    resultado: Resultado
    team: TeamSide | null
    playerNumber: number | null
    confidence: number
  }[]
}

export interface AnalyzeProgress {
  phase: "extracting" | "analyzing" | "mapping"
  /** Progresso de 0 a 1 dentro da fase atual. */
  ratio: number
}

export interface AnalyzeParams {
  file: File
  players?: Player[]
  onProgress?: (p: AnalyzeProgress) => void
  signal?: AbortSignal
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Localiza o rally que contém (ou está mais próximo de) um timestamp. */
function rallyIdForTime(rallies: Rally[], t: number): string {
  if (rallies.length === 0) return "manual"
  const containing = rallies.find((r) => t >= r.startTime && t <= r.endTime)
  if (containing) return containing.id
  let nearest = rallies[0]
  let best = Infinity
  for (const r of rallies) {
    const mid = (r.startTime + r.endTime) / 2
    const d = Math.abs(mid - t)
    if (d < best) {
      best = d
      nearest = r
    }
  }
  return nearest.id
}

/** Resolve o playerId a partir do time + número informado pela IA. */
function resolvePlayer(
  players: Player[],
  team: TeamSide | null,
  number: number | null,
): string | null {
  if (number == null) return null
  const match = players.find(
    (p) => p.number === number && (team == null || p.team === team),
  )
  return match?.id ?? null
}

/** Converte a resposta da IA em ScoutAnalysis. */
function mapToAnalysis(
  ai: AIAnalysis,
  ctx: { videoName: string; videoDuration: number; players: Player[] },
): ScoutAnalysis {
  const sortedRallies = [...(ai.rallies ?? [])].sort(
    (a, b) => a.startTime - b.startTime,
  )
  const rallies: Rally[] = sortedRallies.map((r, i) => ({
    id: `rally_${i + 1}`,
    index: i + 1,
    startTime: Math.max(0, r.startTime),
    endTime: Math.max(r.startTime, r.endTime),
    winner: r.winner ?? null,
  }))

  const actions: ScoutAction[] = (ai.actions ?? [])
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((a, i) => ({
      id: `act_${i + 1}`,
      rallyId: rallyIdForTime(rallies, a.timestamp),
      timestamp: Math.max(0, a.timestamp),
      fundamento: a.fundamento,
      resultado: a.resultado,
      playerId: resolvePlayer(ctx.players, a.team, a.playerNumber),
      confidence: clamp01(a.confidence ?? 0.5),
      validated: false,
    }))

  return {
    videoName: ctx.videoName,
    videoDuration: ctx.videoDuration,
    rallies,
    actions,
    players: ctx.players,
  }
}

/**
 * Fluxo completo da análise real:
 * 1) extrai frames do vídeo;
 * 2) envia para a IA classificar;
 * 3) mapeia para o formato do scout.
 */
export async function analyzeVideoWithAI({
  file,
  players = [],
  onProgress,
  signal,
}: AnalyzeParams): Promise<ScoutAnalysis> {
  // 1) Extração de frames.
  onProgress?.({ phase: "extracting", ratio: 0 })
  const { frames, duration } = await extractFrames(file, {
    maxFrames: 24,
    minInterval: 1,
    width: 480,
    quality: 0.6,
    onProgress: (r) => onProgress?.({ phase: "extracting", ratio: r }),
  })

  if (frames.length === 0) {
    throw new Error(
      "Não foi possível ler os quadros do vídeo. Verifique se o formato é suportado.",
    )
  }

  // 2) Análise pela IA.
  onProgress?.({ phase: "analyzing", ratio: 0 })
  const payloadFrames: ExtractedFrame[] = frames
  const res = await fetch("/api/scout/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoName: file.name,
      videoDuration: duration,
      frames: payloadFrames,
      players,
    }),
    signal,
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? "Falha ao analisar o vídeo com a IA.")
  }

  const { analysis } = (await res.json()) as { analysis: AIAnalysis }
  onProgress?.({ phase: "analyzing", ratio: 1 })

  // 3) Mapeamento.
  onProgress?.({ phase: "mapping", ratio: 0 })
  const mapped = mapToAnalysis(analysis, {
    videoName: file.name,
    videoDuration: duration,
    players,
  })
  onProgress?.({ phase: "mapping", ratio: 1 })

  return mapped
}
