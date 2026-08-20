"use client"

import { useState, useTransition } from "react"
import { Save, Loader2, Building2, ShieldCheck, Check } from "lucide-react"

const inputCls =
  "w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"

/**
 * Configuração da conta: administrador e clube. O clube informado aqui é
 * vinculado ao processo e usado como o clube das atletas no VIB.
 */
export function ConfigForm({
  initial,
  action,
}: {
  initial: { clubeNome: string | null; administrador: string | null }
  action: (formData: FormData) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await action(formData)
        setSaved(true)
      } catch (e: any) {
        setError(e?.message ?? "Erro ao salvar as configurações.")
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div>
        <label className={labelCls} htmlFor="administrador">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Administrador
          </span>
        </label>
        <input
          id="administrador"
          name="administrador"
          defaultValue={initial.administrador ?? ""}
          className={inputCls}
          placeholder="Nome do responsável pela conta"
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="clubeNome">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Clube
          </span>
        </label>
        <input
          id="clubeNome"
          name="clubeNome"
          defaultValue={initial.clubeNome ?? ""}
          className={inputCls}
          placeholder="Ex.: Clube Atlético Vôlei"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Vinculado ao processo: é o clube exibido nas atletas e usado pelo VIB.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && !pending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Check className="h-4 w-4" /> Salvo
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </button>
      </div>
    </form>
  )
}
