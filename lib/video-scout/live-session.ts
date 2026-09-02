// Transmissão da coleta ao vivo (Supabase Realtime).
//
// Cada dispositivo logado publica sua partida em andamento em uma linha própria
// de `vs_live_session` (chave user_id + device_id). Qualquer outro dispositivo
// logado na MESMA conta assina as mudanças e vê o relatório em tempo real,
// enquanto cada um segue coletando de forma independente.

import { createClient } from "@/lib/supabase/client"
import { getDeviceId, getDeviceLabel } from "@/lib/scout/device"
import type { MatchState } from "./match"

// Reexporta para manter compatível quem importa daqui.
export { getDeviceId, getDeviceLabel }

export interface LiveSession {
  deviceId: string
  deviceLabel: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  setNum: number
  updatedAt: number
  match: MatchState
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
  match: MatchState
}

// Considera "ao vivo" transmissões atualizadas recentemente. A janela é maior
// que o intervalo do heartbeat (15s) para NÃO cair durante os tempos técnicos,
// quando a coleta para mas o dispositivo continua enviando o "pulso".
const STALE_MS = 60_000

function rowToSession(row: LiveRow): LiveSession {
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

/** Publica (upsert) a partida atual deste dispositivo como transmissão ao vivo. */
export async function publishLive(match: MatchState): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("vs_live_session").upsert(
    {
      user_id: user.id,
      device_id: getDeviceId(),
      device_label: getDeviceLabel(),
      team_a_name: match.teamA.name,
      team_b_name: match.teamB.name,
      score_a: match.scoreA,
      score_b: match.scoreB,
      set_num: match.set,
      match: JSON.parse(JSON.stringify(match)) as MatchState,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  )
}

/** Encerra a transmissão ao vivo deste dispositivo. */
export async function clearLive(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("vs_live_session").delete().eq("user_id", user.id).eq("device_id", getDeviceId())
}

/**
 * Lê as transmissões ao vivo de OUTROS dispositivos da conta (exclui o atual e
 * as que estão paradas há mais de 30s).
 */
export async function loadLiveSessions(): Promise<LiveSession[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("vs_live_session")
    .select("device_id, device_label, team_a_name, team_b_name, score_a, score_b, set_num, updated_at, match")
    .order("updated_at", { ascending: false })

  if (error || !data) return []

  const now = Date.now()
  const myDevice = getDeviceId()
  return data
    .map((r) => rowToSession(r as LiveRow))
    .filter((s) => s.deviceId !== myDevice && now - s.updatedAt < STALE_MS)
}

/** Reage a mudanças nas transmissões ao vivo (em qualquer dispositivo). */
export function subscribeToLive(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("vs_live_session_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "vs_live_session" }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
