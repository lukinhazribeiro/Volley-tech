import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Voley Tech — Gestão de Clube",
  description:
    "Módulo de Gestão de Clube da Voley Tech: atletas, turmas, check-in, frequência e financeiro em um único ambiente.",
}

export default async function GestaoLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // A Gestão é escopada por conta: cada usuário só vê os próprios dados.
  // Sem sessão, volta para o hub (onde fica o login).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  return <div className={`gestao-theme font-sans ${inter.variable}`}>{children}</div>
}
