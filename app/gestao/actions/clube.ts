"use server"

import { db } from "@/lib/gestao/db"
import { clubeConfig } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/** Lê o nome do clube configurado pela conta. */
export async function getClube(): Promise<{ nomeClube: string | null }> {
  const userId = await getGestaoUserId()
  const [row] = await db
    .select({ nomeClube: clubeConfig.nomeClube })
    .from(clubeConfig)
    .where(eq(clubeConfig.userId, userId))
  return { nomeClube: row?.nomeClube ?? null }
}

/**
 * Grava/atualiza o nome do clube da conta. Esse clube é o "clube atual" das
 * atletas e é vinculado ao processo (usado como identidade padrão no VIB).
 */
export async function saveClube(formData: FormData): Promise<void> {
  const userId = await getGestaoUserId()
  const nome = String(formData.get("nomeClube") ?? "").trim() || null

  await db
    .insert(clubeConfig)
    .values({ userId, nomeClube: nome, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: clubeConfig.userId,
      set: { nomeClube: nome, updatedAt: new Date() },
    })

  revalidatePath("/gestao/configuracoes")
}
