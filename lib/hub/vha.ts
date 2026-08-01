/**
 * Volley Hub — leitura e escrita do formato portátil .VHA.
 *
 * O .VHA contém apenas o histórico ESPORTIVO. Importar nunca sobrescreve:
 * localiza a atleta e ACRESCENTA capítulos à linha do tempo; se não existir,
 * cria uma nova atleta apenas com os dados do arquivo.
 */

import { createClient } from "@/lib/supabase/client"
import { computeIPTV, generateEvaluation } from "./intelligence"
import { buildChapters, evolutionSeries } from "./aggregate"
import {
  VHA_MAGIC,
  VHA_VERSION,
  isVHAFile,
  type HubAthlete,
  type HubHistoryEntry,
  type VHAFile,
} from "./types"

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/** Monta o objeto .VHA de uma atleta a partir das suas entradas. */
export function buildVHA(athlete: HubAthlete, entries: HubHistoryEntry[]): VHAFile {
  const chapters = buildChapters(entries)
  const series = evolutionSeries(chapters)

  return {
    magic: VHA_MAGIC,
    version: VHA_VERSION,
    exportedAt: new Date().toISOString(),
    athlete: {
      fullName: athlete.full_name,
      team: athlete.team,
      category: athlete.category,
      position: athlete.position,
    },
    history: entries.map((e) => ({
      source: e.source,
      team: e.team,
      category: e.category,
      competition: e.competition,
      season: e.season,
      matchDate: e.match_date,
      playerNumber: e.player_number,
      position: e.position,
      stats: e.stats,
      fingerprint: e.fingerprint,
    })),
    evolution: series.map((s) => ({
      label: s.label,
      season: s.season,
      competition: s.label,
      percentuais: {
        ataque: s.ataque,
        recepcao: s.recepcao,
        defesa: s.defesa,
        bloqueio: s.bloqueio,
        saque: s.saque,
      },
    })),
    evaluations: chapters.map((c, i) => ({
      label: c.competition || c.season || `Capítulo ${i + 1}`,
      text: generateEvaluation({
        athleteName: athlete.full_name,
        position: athlete.position || c.entries[0]?.position || "",
        current: c.fundamentals,
        previous: i > 0 ? chapters[i - 1].fundamentals : undefined,
      }),
      createdAt: new Date().toISOString(),
    })),
    timeline: chapters.map((c) => ({
      season: c.season,
      team: c.team,
      category: c.category,
      competition: c.competition,
    })),
    iptv: chapters.map((c) => ({
      label: c.competition || c.season || "—",
      index: computeIPTV(c.fundamentals),
    })),
  }
}

/** Dispara o download de um arquivo .vha. */
export function downloadVHA(athleteName: string, vha: VHAFile): void {
  const blob = new Blob([JSON.stringify(vha, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const safe = athleteName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "atleta"
  a.href = url
  a.download = `${safe}.vha`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Lê e valida um arquivo .vha selecionado pelo usuário. */
export async function parseVHA(file: File): Promise<VHAFile> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("Arquivo inválido: não é um JSON válido.")
  }
  if (!isVHAFile(data)) {
    throw new Error("Arquivo inválido: não é um Volley History Archive (.vha).")
  }
  return data
}

/**
 * Importa um .VHA: localiza a atleta (nome+equipe+categoria); se existir,
 * ACRESCENTA capítulos; se não, cria uma nova atleta. Nunca sobrescreve —
 * duplicatas são ignoradas via fingerprint.
 */
export async function importVHA(vha: VHAFile): Promise<{ athleteId: string; inserted: number; created: boolean }> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id
  if (!userId) throw new Error("Sessão não encontrada. Faça login para usar o Volley Tech.")

  // Localizar atleta existente
  const { data: athletes } = await supabase.from("hub_athletes").select("*")
  const existing = ((athletes ?? []) as HubAthlete[]).find(
    (a) =>
      norm(a.full_name) === norm(vha.athlete.fullName) &&
      norm(a.team) === norm(vha.athlete.team) &&
      norm(a.category) === norm(vha.athlete.category),
  )

  let athleteId: string
  let created = false
  if (existing) {
    athleteId = existing.id
  } else {
    const { data, error } = await supabase
      .from("hub_athletes")
      .insert({
        owner_id: userId,
        full_name: vha.athlete.fullName,
        team: vha.athlete.team,
        category: vha.athlete.category,
        position: vha.athlete.position,
      })
      .select("id")
      .single()
    if (error) throw error
    athleteId = data!.id as string
    created = true
  }

  // Acrescentar capítulos (sem sobrescrever)
  const rows = vha.history.map((h, i) => ({
    owner_id: userId,
    athlete_id: athleteId,
    source: h.source || "vha",
    team: h.team,
    category: h.category,
    competition: h.competition,
    season: h.season,
    match_date: h.matchDate,
    player_number: h.playerNumber,
    position: h.position,
    stats: h.stats,
    raw: { importedFrom: "vha" },
    fingerprint: h.fingerprint || `vha:${vha.athlete.fullName}:${h.season}:${h.competition}:${i}`,
  }))

  const { data: insertedRows, error: insErr } = await supabase
    .from("hub_history_entries")
    .upsert(rows, { onConflict: "owner_id,athlete_id,fingerprint", ignoreDuplicates: true })
    .select("id")
  if (insErr) throw insErr

  await supabase.from("hub_imports").insert({
    owner_id: userId,
    kind: "vha",
    label: `${vha.athlete.fullName} (.vha)`,
    entries_count: insertedRows?.length ?? 0,
  })

  return { athleteId, inserted: insertedRows?.length ?? 0, created }
}
