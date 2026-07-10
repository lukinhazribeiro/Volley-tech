import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Remove o parâmetro sslmode da URL (o Supabase usa certificado self-signed;
// versões recentes do pg tratam sslmode=require como verify-full e rejeitam a conexão).
// O SSL é configurado explicitamente abaixo com rejectUnauthorized: false.
function buildConnectionString() {
  const raw = process.env.POSTGRES_URL
  if (!raw) return raw
  try {
    const url = new URL(raw)
    url.searchParams.delete("sslmode")
    return url.toString()
  } catch {
    return raw
  }
}

export const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: { rejectUnauthorized: false },
})
export const db = drizzle(pool, { schema })
