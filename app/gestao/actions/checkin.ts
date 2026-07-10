"use server"

import { db } from "@/lib/db"
import { atletas, presencas, turmas } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type StatusPresenca = "presente" | "atrasado" | "ausente" | "justificada"

export async function salvarChamada(input: {
  turmaId: number
  data: string
  registros: { atletaId: number; status: StatusPresenca; observacao?: string }[]
}) {
  const { turmaId, data, registros } = input

  // Remove chamada anterior da mesma turma/data (re-registro idempotente)
  await db.delete(presencas).where(and(eq(presencas.turmaId, turmaId), eq(presencas.data, data)))

  if (registros.length > 0) {
    await db.insert(presencas).values(
      registros.map((r) => ({
        atletaId: r.atletaId,
        turmaId,
        data,
        status: r.status,
        observacao: r.observacao || null,
      })),
    )
  }

  revalidatePath("/check-in")
  revalidatePath("/frequencia")
  revalidatePath("/")
  return { ok: true }
}

export async function getTurmasParaChamada() {
  return db
    .select({ id: turmas.id, nome: turmas.nome, professor: turmas.professor, horario: turmas.horario })
    .from(turmas)
    .where(eq(turmas.ativo, true))
    .orderBy(turmas.nome)
}

export async function getChamada(turmaId: number, data: string) {
  const alunos = await db
    .select({ id: atletas.id, nome: atletas.nome, fotoUrl: atletas.fotoUrl })
    .from(atletas)
    .where(and(eq(atletas.turmaId, turmaId), eq(atletas.ativo, true)))
    .orderBy(atletas.nome)

  const registros = await db
    .select({ atletaId: presencas.atletaId, status: presencas.status, observacao: presencas.observacao })
    .from(presencas)
    .where(and(eq(presencas.turmaId, turmaId), eq(presencas.data, data)))

  const mapa = new Map(registros.map((r) => [r.atletaId, r]))

  return alunos.map((a) => ({
    ...a,
    status: (mapa.get(a.id)?.status as StatusPresenca | undefined) ?? "presente",
    observacao: mapa.get(a.id)?.observacao ?? "",
  }))
}
