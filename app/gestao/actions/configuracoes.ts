"use server"

import { db } from "@/lib/gestao/db"
import { gestaoConfig } from "@/lib/gestao/db/schema"
import { getGestaoUserId } from "@/lib/gestao/auth"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface GestaoConfigData {
  clubeNome: string | null
  administrador: string | null
}

/** Lê a configuração da conta (clube/administrador). */
export async function getGestaoConfig(): Promise<GestaoConfigData> {
  const userId = await getGestaoUserId()
  const [row] = await db
    .select({ clubeNome: gestaoConfig.clubeNome, administrador: gestaoConfig.administrador })
    .from(gestaoConfig)
    .where(eq(gestaoConfig.userId, userId))
  return { clubeNome: row?.clubeNome ?? null, administrador: row?.administrador ?? null }
}

/** Salva (upsert) o clube e o administrador da conta. */
export async function saveGestaoConfig(formData: FormData): Promise<void> {
  const userId = await getGestaoUserId()
  const clubeNome = String(formData.get("clubeNome") ?? "").trim() || null
  const administrador = String(formData.get("administrador") ?? "").trim() || null

  await db
    .insert(gestaoConfig)
    .values({ userId, clubeNome, administrador, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: gestaoConfig.userId,
      set: { clubeNome, administrador, updatedAt: new Date() },
    })

  revalidatePath("/gestao/configuracoes")
}
