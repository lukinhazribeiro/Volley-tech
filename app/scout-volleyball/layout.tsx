import type { Metadata } from "next"
import { BackToHub } from "@/components/hub/back-to-hub"

export const metadata: Metadata = {
  title: "Scout Volleyball",
  description: "Análise detalhada de desempenho em voleibol",
}

export default function ScoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="scout-app min-h-screen bg-background text-foreground">
      {children}
      <BackToHub />
    </div>
  )
}
