import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function BackToHub() {
  return (
    <Link
      href="/"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/20 ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95"
      aria-label="Voltar à Hub"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Hub
    </Link>
  )
}
