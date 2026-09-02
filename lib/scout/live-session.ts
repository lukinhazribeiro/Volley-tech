// Transmissão da coleta do Scout Volleibol ao vivo (Supabase Realtime).
//
// Substitui o antigo modo de "sala" (BroadcastChannel/sync-manager), que só
// funcionava no mesmo navegador. Agora a coleta é publicada na CONTA: um
// dispositivo coleta e os demais logados na mesma conta acompanham placar,
// planilha e gráficos em tempo real (somente leitura), de qualquer aparelho.

import { createClient } from "@/lib/supabase/client"
import { getDeviceId, getDeviceLabel } from "@/lib/scout/device"

/**
 * Snapshot da partida em andamento, no formato que a página de coleta já mantém
 * em memória. Guardado inteiro em `match` (jsonb) para o espectador reconstruir
 * placar, planilha e gráficos com os mesmos componentes da coleta.
 */
export interface VoleiLiveSnapshot {
  teamAName: string
  teamBName: string
  category?: string
  actions: unknown[]
  sets: Array<{ number: number; teamAScore: number; teamBScore: number; winner?: "A" | "B" }>
  currentSet: { number: number; teamAScore: number; teamBScore: number }
  teamAPlayers?: unknown[]
  teamBPlayers?: unknown[]
}

export interface VoleiLiveSession {
  deviceId: string
  deviceLabel: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  setNum: number
  updatedAt: number
  /** true quando o pulso parou (parada/sem sinal). Os NÚMEROS continuam. */
  stale: boolean
  snapshot: VoleiLiveSnapshot
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
  match: VoleiLiveSnapshot
}

const TABLE = "sv_live_session"

// Após esse tempo sem pulso, a transmissão é marcada como "parada" (stale),
// mas os NÚMEROS continuam visíveis. A linha só desaparece quando o coletor
// encerra de fato (clearVoleiLive => DELETE). Assim nada cai nas paradas.
const STALE_MS = 30_000

function rowToSession(row: LiveRow): VoleiLiveSession {
  const updatedAt = new Date(row.updated_at).getTime()
  return {
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    teamAName: row.team_a_name,
    teamBName: row.team_b_name,
    scoreA: row.score_a,
    scoreB: row.score_b,
    setNum: row.set_num,
    updatedAt,
    stale: Date.now() - updatedAt >= STALE_MS,
    snapshot: row.match,
  }
}

/** Sets vencidos por cada lado (placar da partida em sets). */
function setScore(snapshot: VoleiLiveSnapshot): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const s of snapshot.sets ?? []) {
    if (s.winner === "A") a++
    else if (s.winner === "B") b++
  }
  return { a, b }
}

/** Publica (upsert) o estado atual da coleta deste dispositivo como ao vivo. */
export async function publishVoleiLive(snapshot: VoleiLiveSnapshot): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const score = setScore(snapshot)
  await supabase.from(TABLE).upsert(
    {
      user_id: user.id,
      device_id: getDeviceId(),
      device_label: getDeviceLabel(),
      team_a_name: snapshot.teamAName || "Equipe A",
      team_b_name: snapshot.teamBName || "Adversário",
      score_a: score.a,
      score_b: score.b,
      set_num: snapshot.currentSet?.number ?? snapshot.sets.length + 1,
      match: JSON.parse(JSON.stringify(snapshot)) as VoleiLiveSnapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  )
}

/** Encerra a transmissão ao vivo deste dispositivo. */
export async function clearVoleiLive(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from(TABLE).delete().eq("user_id", user.id).eq("device_id", getDeviceId())
}

/** Lê as transmissões ao vivo de OUTROS dispositivos da conta (exclui o atual). */
export async function loadVoleiLiveSessions(): Promise<VoleiLiveSession[]> {
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

  // Não descarta sessões "paradas": mantém os números durante as paradas.
  // Só exclui o próprio dispositivo. A linha some apenas quando o coletor
  // encerra a transmissão (DELETE).
  const myDevice = getDeviceId()
  return data.map((r) => rowToSession(r as LiveRow)).filter((s) => s.deviceId !== myDevice)
}

/** Reage a mudanças nas transmissões ao vivo (em qualquer dispositivo da conta). */
export function subscribeToVoleiLive(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("sv_live_session_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
