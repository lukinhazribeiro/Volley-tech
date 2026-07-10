import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Voley Tech — Gestão de Clube",
  description:
    "Módulo de Gestão de Clube da Voley Tech: atletas, turmas, check-in, frequência e financeiro em um único ambiente.",
}

export default function GestaoLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className={`gestao-theme font-sans ${inter.variable}`}>{children}</div>
}
