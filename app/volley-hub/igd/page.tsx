import { Suspense } from "react"
import { IgdAtleta } from "@/components/volley-hub/igd-atleta"

export default function IgdPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--hub-muted)]">Carregando…</p>}>
      <IgdAtleta />
    </Suspense>
  )
}
