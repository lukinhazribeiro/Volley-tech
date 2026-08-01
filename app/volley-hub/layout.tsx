import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HubSidebar } from "@/components/volley-hub/hub-sidebar"

export const metadata: Metadata = {
  title: "Volley Hub — Inteligência Esportiva",
  description:
    "Centro de inteligência da Volley Tech: histórico permanente, linha do tempo, evolução, avaliação inteligente e histórico portátil (.vha) de atletas e equipes.",
}

export default async function VolleyHubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // O Volley Hub é escopado por conta (RLS por auth.uid()). Sem sessão, volta
  // ao hub principal onde fica o login.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  return (
    <div className="hub-theme min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)]">
      <HubSidebar />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
