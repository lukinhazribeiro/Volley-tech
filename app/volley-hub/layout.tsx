import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HubShell } from "@/components/volley-hub/hub-shell"

export const metadata: Metadata = {
  title: "Volley Hub — Inteligência Esportiva",
  description:
    "Centro de inteligência da Volley Tech: histórico permanente, linha do tempo, evolução, avaliação inteligente e histórico portátil (.vha) de atletas e equipes.",
}

export default async function VolleyHubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // As subpáginas do Hub são escopadas por conta (RLS por auth.uid()). Sem
  // sessão, volta à página inicial, onde o AuthGate cuida do login.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  return <HubShell>{children}</HubShell>
}
