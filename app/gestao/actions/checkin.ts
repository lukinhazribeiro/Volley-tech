"use server"

import { db } from "@/lib/gestao/db"
import { atletas, presencas, turmas } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type StatusPresenca = "presente" | "atrasado" | "ausente" | "justificada"

export async function salvarChamada(input: {
  turmaId: number
  data: string
  registros: { atletaId: number; status: StatusPresenca; observacao?: string }[]
}) {
  const userId = await getGestaoUserId()
  const { turmaId, data, registros } = input

  // Remove chamada anterior da mesma turma/data (re-registro idempotente)
  await db
    .delete(presencas)
    .where(and(eq(presencas.turmaId, turmaId), eq(presencas.data, data), eq(presencas.userId, userId)))

  if (registros.length > 0) {
    await db.insert(presencas).values(
      registros.map((r) => ({
        userId,
        atletaId: r.atletaId,
        turmaId,
        data,
        status: r.status,
        observacao: r.observacao || null,
      })),
    )
  }

  revalidatePath("/gestao/check-in")
  revalidatePath("/gestao/frequencia")
  revalidatePath("/gestao")
  return { ok: true }
}

export async function getTurmasParaChamada() {
  const userId = await getGestaoUserId()
  return db
    .select({ id: turmas.id, nome: turmas.nome, professor: turmas.professor, horario: turmas.horario })
    .from(turmas)
    .where(and(eq(turmas.ativo, true), eq(turmas.userId, userId)))
    .orderBy(turmas.nome)
}

export async function getChamada(turmaId: number, data: string) {
  const userId = await getGestaoUserId()
  const alunos = await db
    .select({ id: atletas.id, nome: atletas.nome, fotoUrl: atletas.fotoUrl })
    .from(atletas)
    .where(and(eq(atletas.turmaId, turmaId), eq(atletas.ativo, true), eq(atletas.userId, userId)))
    .orderBy(atletas.nome)

  const registros = await db
    .select({ atletaId: presencas.atletaId, status: presencas.status, observacao: presencas.observacao })
    .from(presencas)
    .where(and(eq(presencas.turmaId, turmaId), eq(presencas.data, data), eq(presencas.userId, userId)))

  const mapa = new Map(registros.map((r) => [r.atletaId, r]))

  return alunos.map((a) => ({
    ...a,
    status: (mapa.get(a.id)?.status as StatusPresenca | undefined) ?? "presente",
    observacao: mapa.get(a.id)?.observacao ?? "",
  }))
}
