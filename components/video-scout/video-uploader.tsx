"use client"

import { useRef, useState } from "react"
import { FileVideo, UploadCloud, AlertCircle, Sparkles, FlaskConical } from "lucide-react"

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm"]
const ACCEPTED_EXT = [".mp4", ".mov", ".m4v", ".webm"]

export type ScoutMode = "demo" | "ai"

interface VideoUploaderProps {
  onSelect: (file: File, mode: ScoutMode) => void
}

export function VideoUploader({ onSelect }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ScoutMode>("demo")

  function validateAndSend(file: File | undefined) {
    if (!file) return
    const okType =
      ACCEPTED.includes(file.type) ||
      ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!okType) {
      setError("Formato não suportado. Envie um vídeo MP4, MOV, M4V ou WEBM.")
      return
    }
    setError(null)
    onSelect(file, mode)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Seleção de modo */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("demo")}
          className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors ${
            mode === "demo"
              ? "border-emerald-500/60 bg-emerald-500/10"
              : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
          }`}
          aria-pressed={mode === "demo"}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FlaskConical className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            Modo demonstração
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
              Grátis
            </span>
          </span>
          <span className="text-xs text-slate-400">
            Testa toda a ferramenta sem custo. Gera jogadas de exemplo (não lê o vídeo de verdade).
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors ${
            mode === "ai"
              ? "border-blue-500/60 bg-blue-500/10"
              : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
          }`}
          aria-pressed={mode === "ai"}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
            Análise por IA
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">
              Real
            </span>
          </span>
          <span className="text-xs text-slate-400">
            A IA assiste ao vídeo e identifica as jogadas. Requer chave de IA configurada (pode ter custo).
          </span>
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          validateAndSend(e.dataTransfer.files?.[0])
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-blue-400 bg-blue-500/10"
            : "border-slate-700 bg-slate-900/40 hover:border-blue-500/60 hover:bg-slate-900/70"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
          <UploadCloud className="h-8 w-8" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-100 text-balance">
            Arraste o vídeo da partida ou clique para enviar
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Aceita gravações de celular e câmeras: MP4, MOV, M4V ou WEBM
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          <FileVideo className="h-4 w-4" aria-hidden="true" />
          Selecionar vídeo
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-m4v,video/webm,.mp4,.mov,.m4v,.webm"
          className="sr-only"
          onChange={(e) => validateAndSend(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-500 text-pretty">
        {mode === "demo"
          ? "Modo demonstração: gera uma partida de exemplo para você conhecer a ferramenta, sem custo e sem chave de IA. Você valida e gera o scout normalmente."
          : "Análise por IA: o vídeo é lido no seu dispositivo e os quadros são enviados à IA para identificar as jogadas. Você valida ou corrige antes de salvar o scout."}
      </p>
    </div>
  )
}
