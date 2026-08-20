import { Suspense } from "react"
import { VibAtleta } from "@/components/volley-hub/vib-atleta"

export default function VibPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--hub-muted)]">Carregando…</p>}>
      <VibAtleta />
    </Suspense>
  )
}
