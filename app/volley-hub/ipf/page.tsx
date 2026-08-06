import { Suspense } from "react"
import { IpfAtleta } from "@/components/volley-hub/ipf-atleta"

export default function IpfPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--hub-muted)]">Carregando…</p>}>
      <IpfAtleta />
    </Suspense>
  )
}
