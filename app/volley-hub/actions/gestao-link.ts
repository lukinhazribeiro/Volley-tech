"use server"

import { db } from "@/lib/gestao/db"
import { atletas, turmas, categorias, gestaoConfig } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, asc, eq } from "drizzle-orm"

/**
 * Ponte Hub↔Gestão. O Hub (Supabase) e a Gestão (Drizzle/Postgres) são módulos
 * independentes, mas pertencem ao MESMO usuário (Supabase user.id). Estas server
 * actions expõem apenas os dados CADASTRAIS da Gestão necessários ao vínculo e
 * aos relatórios — nunca dados financeiros.
 */

export interface GestaoAthleteOption {
  id: number
  nome: string
  categoria: string | null
  turma: string | null
  dataNascimento: string | null
  genero: string | null
  posicao: string | null
}

/** Lista as atletas ativas da Gestão do usuário (para vincular / sugerir). */
export async function listGestaoAthletes(): Promise<GestaoAthleteOption[]> {
  let userId: string
  try {
    userId = await getGestaoUserId()
  } catch {
    // Usuário sem sessão de Gestão => nada a oferecer.
    return []
  }

  const rows = await db
    .select({
      id: atletas.id,
      nome: atletas.nome,
      categoria: categorias.nome,
      turma: turmas.nome,
      dataNascimento: atletas.dataNascimento,
      genero: atletas.genero,
      posicao: atletas.posicao,
      ativo: atletas.ativo,
    })
    .from(atletas)
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .where(eq(atletas.userId, userId))
    .orderBy(asc(atletas.nome))

  return rows
    .filter((r) => r.ativo)
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      turma: r.turma,
      dataNascimento: r.dataNascimento,
      genero: r.genero,
      posicao: r.posicao,
    }))
}

/** Dados cadastrais de UMA atleta da Gestão (para enriquecer o relatório). */
export async function getGestaoAthlete(id: number): Promise<GestaoAthleteOption | null> {
  if (!id || Number.isNaN(id)) return null
  let userId: string
  try {
    userId = await getGestaoUserId()
  } catch {
    return null
  }

  const [row] = await db
    .select({
      id: atletas.id,
      nome: atletas.nome,
      categoria: categorias.nome,
      turma: turmas.nome,
      dataNascimento: atletas.dataNascimento,
      genero: atletas.genero,
      posicao: atletas.posicao,
    })
    .from(atletas)
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .where(and(eq(atletas.id, id), eq(atletas.userId, userId)))

  return row ?? null
}

/**
 * Write-back cadastral Hub→Gestão. Quando a identidade é editada manualmente no
 * VIB de uma atleta vinculada, os campos correspondentes são atualizados no
 * cadastro da Gestão (escopado por userId), mantendo os dois lados consistentes.
 * Só grava campos definidos (undefined = não mexe).
 */
export async function updateGestaoAthleteIdentity(
  gestaoId: number,
  input: { dataNascimento?: string | null; genero?: string | null; posicao?: string | null },
): Promise<void> {
  if (!gestaoId || Number.isNaN(gestaoId)) return
  let userId: string
  try {
    userId = await getGestaoUserId()
  } catch {
    return
  }
  const patch: Record<string, unknown> = {}
  if (input.dataNascimento !== undefined) patch.dataNascimento = input.dataNascimento || null
  if (input.genero !== undefined) patch.genero = input.genero || null
  if (input.posicao !== undefined) patch.posicao = input.posicao || null
  if (Object.keys(patch).length === 0) return
  await db.update(atletas).set(patch).where(and(eq(atletas.id, gestaoId), eq(atletas.userId, userId)))
}

/** Nome do clube configurado na Gestão para a conta (usado como clube da atleta no VIB). */
export async function getGestaoClube(): Promise<string | null> {
  let userId: string
  try {
    userId = await getGestaoUserId()
  } catch {
    return null
  }
  const [row] = await db
    .select({ clubeNome: gestaoConfig.clubeNome })
    .from(gestaoConfig)
    .where(eq(gestaoConfig.userId, userId))
  return row?.clubeNome ?? null
}
