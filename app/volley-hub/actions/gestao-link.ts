"use server"

import { db } from "@/lib/gestao/db"
import { atletas, turmas, categorias } from "@/lib/gestao/db/schema"
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
    })
    .from(atletas)
    .leftJoin(categorias, eq(categorias.id, atletas.categoriaId))
    .leftJoin(turmas, eq(turmas.id, atletas.turmaId))
    .where(and(eq(atletas.id, id), eq(atletas.userId, userId)))

  return row ?? null
}
