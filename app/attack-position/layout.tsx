import type { Metadata } from "next"
import { BackToHub } from "@/components/hub/back-to-hub"

export const metadata: Metadata = {
  title: "Attack Position - VolleyStats",
  description: "Registro de jogadas e posições de ataque no voleibol",
}

export default function AttackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="attack-app min-h-screen bg-slate-50 text-slate-900">
      {children}
      <BackToHub />
    </div>
  )
}
