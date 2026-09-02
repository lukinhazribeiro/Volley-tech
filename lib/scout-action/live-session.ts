// Transmissão da coleta do Scout Action ao vivo (Supabase Realtime).
//
// Espelha lib/video-scout/live-session.ts. Cada dispositivo logado publica sua
// partida em andamento em uma linha própria de `sa_live_session` (chave
// user_id + device_id). Qualquer outro dispositivo logado na MESMA conta assina
// as mudanças e vê o relatório em tempo real (somente leitura).

import { createClient } from "@/lib/supabase/client"
import { getDeviceId, getDeviceLabel } from "@/lib/scout/device"
import type { ScoutActionMatch } from "./types"

export interface ActionLiveSession {
  deviceId: string
  deviceLabel: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  setNum: number
  updatedAt: number
  match: ScoutActionMatch
}

interface LiveRow {
  device_id: string
  device_label: string
  team_a_name: string
  team_b_name: string
  score_a: number
  score_b: number
  set_num: number
  updated_at: string
  match: ScoutActionMatch
}

const TABLE = "sa_live_session"

// Janela maior que o heartbeat (15s) para não cair durante tempos técnicos.
const STALE_MS = 60_000

function rowToSession(row: LiveRow): ActionLiveSession {
  return {
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    teamAName: row.team_a_name,
    teamBName: row.team_b_name,
    scoreA: row.score_a,
    scoreB: row.score_b,
    setNum: row.set_num,
    updatedAt: new Date(row.updated_at).getTime(),
    match: row.match,
  }
}

function currentScore(match: ScoutActionMatch): { a: number; b: number; setNum: number } {
  // Placar do set em andamento: pontos após o último set encerrado.
  const closed = match.setScores ?? []
  let a = 0
  let b = 0
  for (const e of match.events ?? []) {
    if (e.kind !== "ponto") continue
    if (e.setIndex !== closed.length) continue
    if (e.side === "A") a++
    else b++
  }
  return { a, b, setNum: closed.length + 1 }
}

/** Publica (upsert) a partida atual deste dispositivo como transmissão ao vivo. */
export async function publishActionLive(match: ScoutActionMatch): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const score = currentScore(match)
  await supabase.from(TABLE).upsert(
    {
      user_id: user.id,
      device_id: getDeviceId(),
      device_label: getDeviceLabel(),
      team_a_name: match.teamA?.name || "Equipe A",
      team_b_name: match.teamB?.name || "Equipe B",
      score_a: score.a,
      score_b: score.b,
      set_num: score.setNum,
      match: JSON.parse(JSON.stringify(match)) as ScoutActionMatch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  )
}

/** Encerra a transmissão ao vivo deste dispositivo. */
export async function clearActionLive(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from(TABLE).delete().eq("user_id", user.id).eq("device_id", getDeviceId())
}

/** Lê as transmissões ao vivo de OUTROS dispositivos da conta (exclui o atual). */
export async function loadActionLiveSessions(): Promise<ActionLiveSession[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select("device_id, device_label, team_a_name, team_b_name, score_a, score_b, set_num, updated_at, match")
    .order("updated_at", { ascending: false })

  if (error || !data) return []

  const now = Date.now()
  const myDevice = getDeviceId()
  return data
    .map((r) => rowToSession(r as LiveRow))
    .filter((s) => s.deviceId !== myDevice && now - s.updatedAt < STALE_MS)
}

/** Reage a mudanças nas transmissões ao vivo (em qualquer dispositivo da conta). */
export function subscribeToActionLive(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("sa_live_session_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
