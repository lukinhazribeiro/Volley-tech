"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/subscription"
import { Check, Copy, Clock, Upload, AlertTriangle } from "lucide-react"

interface PixConfig {
  key: string
  keyType: string
  recipientName: string
  amount: number
  configured: boolean
}

interface LatestPayment {
  id: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Falha ao carregar")
    return r.json()
  })

export function PixPayment() {
  const { data, mutate } = useSWR<{ pix: PixConfig; latest: LatestPayment | null }>(
    "/api/subscription/pix/config",
    fetcher,
  )
  const [copied, setCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pix = data?.pix
  const latest = data?.latest

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copied])

  const copyKey = async () => {
    if (!pix?.key) return
    try {
      await navigator.clipboard.writeText(pix.key)
      setCopied(true)
    } catch {
      setError("Não foi possível copiar a chave.")
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("Anexe o comprovante do Pix.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("receipt", file)
      if (note.trim()) fd.append("note", note.trim())
      const res = await fetch("/api/subscription/pix/submit", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar o comprovante.")
      setSuccess(true)
      setFile(null)
      setNote("")
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.")
    } finally {
      setLoading(false)
    }
  }

  if (!pix) {
    return <p className="py-6 text-center text-sm text-slate-500">Carregando dados do Pix...</p>
  }

  if (!pix.configured) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          O pagamento via Pix ainda não foi configurado pelo administrador. Use o Mercado Pago ou
          tente novamente mais tarde.
        </span>
      </div>
    )
  }

  // Já existe um pedido pendente ou aprovado
  if (latest && (latest.status === "pending" || latest.status === "approved")) {
    return (
      <div
        className={`rounded-lg px-4 py-4 text-sm ${
          latest.status === "approved"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 font-semibold">
          {latest.status === "approved" ? (
            <>
              <Check className="h-4 w-4" /> Pagamento aprovado
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" /> Aguardando aprovação
            </>
          )}
        </div>
        <p>
          {latest.status === "approved"
            ? "Seu acesso foi liberado. Obrigado!"
            : "Recebemos seu comprovante. Assim que o pagamento for confirmado, seu acesso será liberado."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Valor mensal
        </p>
        <p className="text-2xl font-black text-orange-600">{formatPrice(pix.amount)}</p>

        <div className="mt-3 space-y-2 text-sm">
          {pix.recipientName && (
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Recebedor:</span> {pix.recipientName}
            </p>
          )}
          {pix.keyType && (
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Tipo de chave:</span> {pix.keyType}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">Chave Pix:</span>
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-slate-700">
              {pix.key}
            </code>
            <button
              onClick={copyKey}
              className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      <ol className="space-y-1 text-xs text-slate-500">
        <li>1. Faça o Pix de {formatPrice(pix.amount)} para a chave acima.</li>
        <li>2. Anexe o comprovante abaixo e envie.</li>
        <li>3. Seu acesso é liberado após a confirmação do pagamento.</li>
      </ol>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setError(null)
            setSuccess(false)
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:border-orange-400 hover:text-orange-600"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : "Anexar comprovante (imagem ou PDF)"}
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Observação (opcional)"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none"
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="h-12 w-full bg-orange-600 text-base font-semibold text-white hover:bg-orange-700"
      >
        {loading ? "Enviando..." : "Enviar comprovante"}
      </Button>
    </div>
  )
}
