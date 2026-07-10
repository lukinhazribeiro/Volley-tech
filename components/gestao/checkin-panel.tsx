"use client"

import { getChamada, salvarChamada, type StatusPresenca } from "@/app/gestao/actions/checkin"
import { CheckCircle2, Clock, XCircle, FileText, Save, Loader2 } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

type Turma = { id: number; nome: string; professor: string | null; horario: string | null }
type Registro = { id: number; nome: string; fotoUrl: string | null; status: StatusPresenca; observacao: string }

const OPCOES: { value: StatusPresenca; label: string; icon: typeof CheckCircle2; classe: string }[] = [
  { value: "presente", label: "Presente", icon: CheckCircle2, classe: "bg-[var(--success)] text-white border-transparent" },
  { value: "atrasado", label: "Atrasado", icon: Clock, classe: "bg-[var(--warning)] text-black border-transparent" },
  { value: "ausente", label: "Ausente", icon: XCircle, classe: "bg-destructive text-destructive-foreground border-transparent" },
  { value: "justificada", label: "Justificada", icon: FileText, classe: "bg-[var(--info)] text-white border-transparent" },
]

function hoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function CheckinPanel({ turmas }: { turmas: Turma[] }) {
  const [turmaId, setTurmaId] = useState<number | null>(turmas[0]?.id ?? null)
  const [data, setData] = useState(hoje())
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (turmaId == null) return
    setCarregando(true)
    setSalvo(false)
    getChamada(turmaId, data)
      .then((r) => setRegistros(r as Registro[]))
      .finally(() => setCarregando(false))
  }, [turmaId, data])

  function setStatus(atletaId: number, status: StatusPresenca) {
    setRegistros((prev) => prev.map((r) => (r.id === atletaId ? { ...r, status } : r)))
    setSalvo(false)
  }

  function marcarTodos(status: StatusPresenca) {
    setRegistros((prev) => prev.map((r) => ({ ...r, status })))
    setSalvo(false)
  }

  function salvar() {
    if (turmaId == null) return
    startTransition(async () => {
      await salvarChamada({
        turmaId,
        data,
        registros: registros.map((r) => ({ atletaId: r.id, status: r.status, observacao: r.observacao })),
      })
      setSalvo(true)
    })
  }

  const resumo = OPCOES.map((o) => ({
    ...o,
    total: registros.filter((r) => r.status === o.value).length,
  }))

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Turma</span>
            <select
              value={turmaId ?? ""}
              onChange={(e) => setTurmaId(Number(e.target.value))}
              className="min-w-56 rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Data</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            />
          </label>
        </div>
        <button
          onClick={salvar}
          disabled={pending || carregando || registros.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {salvo ? "Chamada salva" : "Salvar chamada"}
        </button>
      </div>

      {/* Resumo automático */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {resumo.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.value} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                {r.label}
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{r.total}</p>
            </div>
          )
        })}
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm text-muted-foreground">Marcar todos como:</span>
        {OPCOES.map((o) => (
          <button
            key={o.value}
            onClick={() => marcarTodos(o.value)}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando lista...
          </div>
        ) : registros.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Nenhum atleta ativo vinculado a esta turma.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {registros.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                    {r.nome.charAt(0)}
                  </div>
                  <span className="font-medium text-foreground">{r.nome}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {OPCOES.map((o) => {
                    const Icon = o.icon
                    const ativo = r.status === o.value
                    return (
                      <button
                        key={o.value}
                        onClick={() => setStatus(r.id, o.value)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          ativo ? o.classe : "border-border bg-background text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
