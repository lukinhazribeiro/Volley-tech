import { generateText, Output } from "ai"
import * as z from "zod"

// Permite vídeos mais longos / mais frames.
export const maxDuration = 120

const frameSchema = z.object({
  t: z.number(),
  dataUrl: z.string(),
})

const playerSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string(),
  team: z.enum(["casa", "adversario"]),
})

const requestSchema = z.object({
  videoName: z.string(),
  videoDuration: z.number(),
  frames: z.array(frameSchema).min(1).max(40),
  players: z.array(playerSchema).default([]),
})

// Schema da resposta da IA.
const analysisSchema = z.object({
  rallies: z
    .array(
      z.object({
        startTime: z.number().describe("Início do rally em segundos"),
        endTime: z.number().describe("Fim do rally em segundos"),
        winner: z
          .enum(["casa", "adversario"])
          .nullable()
          .describe("Lado que pontuou no fim do rally, ou null se incerto"),
      }),
    )
    .describe("Trechos contínuos de bola em jogo, em ordem cronológica"),
  actions: z
    .array(
      z.object({
        timestamp: z.number().describe("Momento da ação em segundos"),
        fundamento: z.enum([
          "saque",
          "recepcao",
          "levantamento",
          "ataque",
          "bloqueio",
          "defesa",
        ]),
        resultado: z.enum(["ponto", "erro", "continuidade"]),
        team: z
          .enum(["casa", "adversario"])
          .nullable()
          .describe("casa = time no lado inferior/próximo da quadra; adversario = lado oposto"),
        playerNumber: z
          .number()
          .nullable()
          .describe("Número da camisa da atleta, se claramente visível; senão null"),
        confidence: z
          .number()
          .describe("Confiança de 0 a 1 de que a ação foi identificada corretamente"),
      }),
    )
    .describe("Ações de voleibol identificadas, apenas as visíveis nos frames"),
})

const SYSTEM = `Você é um analista de scout de voleibol. Recebe uma sequência de frames amostrados de um vídeo de uma partida, cada um com seu timestamp em segundos (em ordem cronológica).

Sua tarefa:
1. Identifique os rallies (trechos contínuos com a bola em jogo, do saque até o ponto/erro).
2. Identifique as ações de voleibol visíveis: saque, recepcao (passe), levantamento, ataque, bloqueio, defesa.
3. Para cada ação informe o resultado: "ponto", "erro" ou "continuidade".

Regras importantes:
- Seja CONSERVADOR: só relate ações que você realmente consegue ver nos frames. É melhor relatar menos ações corretas do que inventar.
- Como os frames são amostrados (não é todo quadro), nem toda ação aparece. Não invente uma sequência completa de jogadas se ela não estiver visível.
- Use o timestamp do frame onde a ação aparece.
- "casa" = time no lado inferior/mais próximo da câmera; "adversario" = lado oposto. Seja consistente.
- playerNumber só se o número da camisa estiver claramente legível; caso contrário null.
- confidence reflete o quão claramente a ação é visível.
- Se os frames não mostrarem voleibol identificável, retorne listas vazias.`

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Dados de entrada inválidos." }, { status: 400 })
  }

  const { videoName, videoDuration, frames } = parsed.data

  // Monta o conteúdo multimodal: texto + imagem para cada frame.
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
  > = [
    {
      type: "text",
      text: `Partida: "${videoName}". Duração aproximada: ${videoDuration.toFixed(
        0,
      )}s. A seguir, ${frames.length} frames amostrados em ordem cronológica. Analise-os como uma sequência temporal.`,
    },
  ]

  for (const f of frames) {
    content.push({ type: "text", text: `Frame em ${f.t.toFixed(1)}s:` })
    content.push({ type: "image", image: f.dataUrl })
  }

  try {
    const { output } = await generateText({
      model: "google/gemini-3-flash",
      system: SYSTEM,
      output: Output.object({ schema: analysisSchema }),
      messages: [{ role: "user", content }],
    })

    return Response.json({ analysis: output })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log("[v0] Erro na análise de vídeo:", message)

    // Mensagens mais claras para causas comuns.
    const lower = message.toLowerCase()
    if (lower.includes("credit card") || lower.includes("billing") || lower.includes("402")) {
      return Response.json(
        {
          error:
            "A IA de visão (Vercel AI Gateway) precisa de cobrança ativada no projeto. Adicione um cartão no AI Gateway ou configure a variável AI_GATEWAY_API_KEY para liberar a análise.",
        },
        { status: 402 },
      )
    }
    if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("403")) {
      return Response.json(
        {
          error:
            "Sem credenciais válidas para a IA. Configure o acesso ao Vercel AI Gateway (cartão ou AI_GATEWAY_API_KEY) e tente novamente.",
        },
        { status: 401 },
      )
    }
    return Response.json(
      { error: "Falha ao analisar o vídeo com a IA. Tente novamente." },
      { status: 500 },
    )
  }
}
