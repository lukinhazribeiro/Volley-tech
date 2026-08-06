import { Suspense } from "react"
import { HubTimeline } from "@/components/volley-hub/hub-timeline"

export default function LinhaDoTempoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--hub-muted)]">Carregando…</p>}>
      <HubTimeline />
    </Suspense>
  )
}
