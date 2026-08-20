"use client"

import { useState, useTransition } from "react"
import { Building2, Save, Loader2, Check } from "lucide-react"
import { saveClube } from "@/app/gestao/actions/clube"

/**
 * Formulário do perfil do clube (Configurações), exibido abaixo do
 * administrador. O nome informado aqui vira o "clube atual" das atletas e é
 * vinculado ao processo — o VIB usa esse clube por padrão.
 */
export function ClubeConfigForm({ initialNome }: { initialNome: string | null }) {
  const [nome, setNome] = useState(initialNome ?? "")
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setSaved(false)
    startTransition(async () => {
      await saveClube(formData)
      setSaved(true)
    })
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Clube</h2>
          <p className="text-sm text-muted-foreground">
            Nome do clube da conta. É o clube atual das atletas e alimenta o VIB na Hub.
          </p>
        </div>
      </div>

      <label htmlFor="nomeClube" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Nome do clube
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="nomeClube"
          name="nomeClube"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setSaved(false)
          }}
          placeholder="Ex.: Clube Volley Tech"
          className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Salvo" : "Salvar clube"}
        </button>
      </div>
    </form>
  )
}
