"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Pencil, Power, PowerOff, Loader2 } from "lucide-react"
import { toggleTurma } from "@/app/actions/turmas"

export function TurmaCardActions({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/turmas/${id}/editar`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Editar turma"
        aria-label="Editar turma"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={() => startTransition(() => toggleTurma(id, !ativo))}
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        title={ativo ? "Inativar turma" : "Reativar turma"}
        aria-label={ativo ? "Inativar turma" : "Reativar turma"}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </button>
    </div>
  )
}
