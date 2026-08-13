import type { Metadata } from "next"
import { BackToHub } from "@/components/hub/back-to-hub"

export const metadata: Metadata = {
  title: "Scout Action",
  description: "Coleta rápida de scout com rodízio automático",
}

export default function ScoutActionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="scout-app min-h-screen bg-background text-foreground">
      {children}
      <BackToHub />
    </div>
  )
}
