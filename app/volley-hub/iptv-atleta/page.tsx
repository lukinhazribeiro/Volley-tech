import { Suspense } from "react"
import { IptvAtleta } from "@/components/volley-hub/iptv-atleta"

export default function IptvAtletaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--hub-muted)]">Carregando…</p>}>
      <IptvAtleta />
    </Suspense>
  )
}
