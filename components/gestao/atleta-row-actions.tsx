"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Pencil, Power, PowerOff, Loader2 } from "lucide-react"
import { toggleAtletaAtivo } from "@/app/actions/atletas"

export function AtletaRowActions({ id, ativo }: { id: number; ativo: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/atletas/${id}/editar`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Editar"
        aria-label="Editar atleta"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={() => startTransition(() => toggleAtletaAtivo(id, !ativo))}
        disabled={pending}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        title={ativo ? "Inativar" : "Reativar"}
        aria-label={ativo ? "Inativar atleta" : "Reativar atleta"}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : ativo ? (
          <PowerOff className="h-4 w-4" />
        ) : (
          <Power className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
