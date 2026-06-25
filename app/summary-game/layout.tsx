import type { Metadata } from "next"
import { BackToHub } from "@/components/hub/back-to-hub"

export const metadata: Metadata = {
  title: "Summary Volley Pro",
  description: "Sistema profissional de súmula digital para vôlei",
}

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="summary-app min-h-screen bg-background text-foreground">
      {children}
      <BackToHub />
    </div>
  )
}
