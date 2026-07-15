"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Pencil, Power, PowerOff, Loader2, Trash2 } from "lucide-react"
import { toggleTurma, deleteTurma } from "@/app/gestao/actions/turmas"

export function TurmaCardActions({ id, ativo, nome }: { id: number; ativo: boolean; nome: string }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Apagar a turma "${nome}"? Esta ação não pode ser desfeita. Só é possível apagar turmas sem atletas vinculados.`,
      )
    ) {
      return
    }
    startTransition(async () => {
      try {
        await deleteTurma(id)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Não foi possível apagar a turma.")
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/gestao/turmas/${id}/editar`}
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
      <button
        onClick={handleDelete}
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
        title="Apagar turma"
        aria-label="Apagar turma"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
