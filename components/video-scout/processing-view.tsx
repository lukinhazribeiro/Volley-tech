"use client"

import { Check, Loader2, Film, AlertTriangle, RotateCcw } from "lucide-react"
import type { AnalyzeProgress } from "@/lib/video-scout/engine"

const STEPS = [
  "Extraindo os quadros do vídeo",
  "Enviando os quadros para a IA de visão",
  "Classificando rallies e ações",
  "Montando a linha do tempo das jogadas",
]

interface ProcessingViewProps {
  videoName: string
  /** Progresso geral de 0 a 100. */
  progress: number
  /** Fase atual da análise. */
  phase: AnalyzeProgress["phase"]
  /** Mensagem de erro, se houver. */
  error?: string | null
  onRetry?: () => void
  onReset?: () => void
}

/** Mapeia a fase atual para o índice do passo exibido. */
function phaseToStep(phase: AnalyzeProgress["phase"], progress: number): number {
  if (phase === "extracting") return 0
  if (phase === "analyzing") return progress >= 80 ? 2 : 1
  return 3
}

export function ProcessingView({
  videoName,
  progress,
  phase,
  error,
  onRetry,
  onReset,
}: ProcessingViewProps) {
  const activeStep = phaseToStep(phase, progress)
  const pct = Math.floor(progress)

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <Film className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{videoName}</p>
            <p className="text-xs text-slate-500">
              {error
                ? "Falha na análise"
                : "Analisando com inteligência artificial de visão"}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Tentar novamente
                </button>
              )}
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Escolher outro vídeo
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Processando</span>
                <span className="font-mono font-medium text-orange-600">{pct}%</span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {STEPS.map((step, i) => {
                const done = i < activeStep
                const active = i === activeStep
                return (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                          : active
                            ? "border-orange-300 bg-orange-100 text-orange-700"
                            : "border-slate-200 bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="text-xs">{i + 1}</span>
                      )}
                    </span>
                    <span className={done || active ? "text-slate-700" : "text-slate-400"}>
                      {step}
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className="mt-6 text-xs leading-relaxed text-slate-400">
              A IA analisa quadros amostrados do vídeo e sugere as ações. Na próxima
              etapa você confirma ou corrige cada jogada antes de gerar o scout.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
