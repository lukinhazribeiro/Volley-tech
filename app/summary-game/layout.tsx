import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BackToHub } from "@/components/hub/back-to-hub"

export const metadata: Metadata = {
  title: "Summary Volley Pro",
  description: "Sistema profissional de súmula digital para vôlei",
}

export default async function SummaryLayout({ children }: { children: React.ReactNode }) {
  // Dados do Summary Game são salvos por conta. Sem sessão, volta ao hub (login).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  return (
    <div className="summary-app min-h-screen bg-background text-foreground">
      {children}
      <BackToHub />
    </div>
  )
}
