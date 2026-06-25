"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Video } from "lucide-react"
import type { Player, ScoutAction, ScoutAnalysis } from "@/lib/video-scout/types"
import {
  analyzeVideoWithAI,
  buildDemoAnalysis,
  type AnalyzeProgress,
} from "@/lib/video-scout/engine"
import { VideoUploader, type ScoutMode } from "./video-uploader"
import { ProcessingView } from "./processing-view"
import { ValidationView } from "./validation-view"
import { ScoutReport } from "./scout-report"

type Step = "upload" | "processing" | "validation" | "scout"

export interface VideoScoutModuleProps {
  /** Elenco opcional vindo do seu app. Se omitido, usa um elenco de exemplo. */
  players?: Player[]
  /** Botão de voltar para integrar com a navegação do seu site. */
  onExit?: () => void
}

export function VideoScoutModule({ players, onExit }: VideoScoutModuleProps) {
  const [step, setStep] = useState<Step>("upload")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoName, setVideoName] = useState("")
  const [analysis, setAnalysis] = useState<ScoutAnalysis | null>(null)

  // Estado do processamento real.
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<AnalyzeProgress["phase"]>("extracting")
  const [error, setError] = useState<string | null>(null)
  const [runToken, setRunToken] = useState(0)
  const fileRef = useRef<File | null>(null)
  const modeRef = useRef<ScoutMode>("demo")

  // Libera a URL do objeto ao desmontar.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const handleSelect = useCallback((file: File, mode: ScoutMode) => {
    const url = URL.createObjectURL(file)
    fileRef.current = file
    modeRef.current = mode
    setVideoUrl(url)
    setVideoName(file.name)
    setError(null)
    setProgress(0)
    setPhase("extracting")
    setStep("processing")
    setRunToken((t) => t + 1)
  }, [])

  const retry = useCallback(() => {
    setError(null)
    setProgress(0)
    setPhase("extracting")
    setRunToken((t) => t + 1)
  }, [])

  // Pipeline real: extrai frames -> IA -> mapeia. Reexecuta a cada runToken.
  useEffect(() => {
    if (step !== "processing" || !fileRef.current || runToken === 0) return

    const file = fileRef.current
    const controller = new AbortController()
    let cancelled = false
    // Anima o progresso durante a chamada de rede da IA (sem progresso real).
    let analyzeTimer: ReturnType<typeof setInterval> | null = null

    const stopAnalyzeTimer = () => {
      if (analyzeTimer) {
        clearInterval(analyzeTimer)
        analyzeTimer = null
      }
    }

    const onProgress = ({ phase: ph, ratio }: AnalyzeProgress) => {
      if (cancelled) return
      setPhase(ph)
      if (ph === "extracting") {
        setProgress(Math.round(ratio * 40))
      } else if (ph === "analyzing") {
        if (ratio === 0) {
          // Inicia animação suave até ~88% enquanto processa.
          setProgress(45)
          stopAnalyzeTimer()
          analyzeTimer = setInterval(() => {
            setProgress((p) => (p < 88 ? p + 1 : p))
          }, 400)
        } else {
          stopAnalyzeTimer()
          setProgress(Math.max(92, Math.round(45 + ratio * 47)))
        }
      } else {
        stopAnalyzeTimer()
        setProgress(96)
      }
    }

    async function run() {
      try {
        const result =
          modeRef.current === "demo"
            ? await buildDemoAnalysis({ file, players, onProgress })
            : await analyzeVideoWithAI({
                file,
                players,
                signal: controller.signal,
                onProgress,
              })
        if (cancelled) return
        stopAnalyzeTimer()
        setProgress(100)
        setAnalysis(result)
        setStep("validation")
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        stopAnalyzeTimer()
        setError(
          err instanceof Error
            ? err.message
            : "Erro inesperado ao analisar o vídeo.",
        )
      }
    }

    run()

    return () => {
      cancelled = true
      stopAnalyzeTimer()
      controller.abort()
    }
  }, [step, runToken, players])

  // ----- Manipulação das ações -----
  const updateAction = useCallback((updated: ScoutAction) => {
    setAnalysis((prev) =>
      prev
        ? { ...prev, actions: prev.actions.map((a) => (a.id === updated.id ? updated : a)) }
        : prev,
    )
  }, [])

  const deleteAction = useCallback((id: string) => {
    setAnalysis((prev) =>
      prev ? { ...prev, actions: prev.actions.filter((a) => a.id !== id) } : prev,
    )
  }, [])

  const addAction = useCallback((timestamp: number) => {
    setAnalysis((prev) => {
      if (!prev) return prev
      const newAction: ScoutAction = {
        id: `act_manual_${Date.now()}`,
        rallyId: prev.rallies[0]?.id ?? "manual",
        timestamp,
        fundamento: "ataque",
        resultado: "continuidade",
        playerId: null,
        confidence: 1,
        validated: true,
      }
      const actions = [...prev.actions, newAction].sort(
        (a, b) => a.timestamp - b.timestamp,
      )
      return { ...prev, actions }
    })
  }, [])

  // ----- Manipulação do elenco (números e equipes editáveis) -----
  const updatePlayer = useCallback((updated: Player) => {
    setAnalysis((prev) =>
      prev
        ? { ...prev, players: prev.players.map((p) => (p.id === updated.id ? updated : p)) }
        : prev,
    )
  }, [])

  const addPlayer = useCallback((team: Player["team"]) => {
    setAnalysis((prev) => {
      if (!prev) return prev
      const sameTeam = prev.players.filter((p) => p.team === team)
      const nextNumber =
        sameTeam.reduce((max, p) => Math.max(max, p.number), 0) + 1
      const newPlayer: Player = {
        id: `player_${Date.now()}`,
        number: nextNumber,
        name: `Atleta ${nextNumber}`,
        team,
      }
      return { ...prev, players: [...prev.players, newPlayer] }
    })
  }, [])

  const removePlayer = useCallback((id: string) => {
    setAnalysis((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.filter((p) => p.id !== id),
        // Desvincula as ações do atleta removido.
        actions: prev.actions.map((a) =>
          a.playerId === id ? { ...a, playerId: null } : a,
        ),
      }
    })
  }, [])

  const resetAll = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    fileRef.current = null
    setVideoUrl(null)
    setVideoName("")
    setAnalysis(null)
    setError(null)
    setProgress(0)
    setPhase("extracting")
    setStep("upload")
  }, [videoUrl])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Cabeçalho do módulo */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Video className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-balance">
                Scout Automático por Vídeo
              </h1>
              <p className="text-xs text-slate-400">
                A IA detecta os rallies e sugere as ações · você valida e gera o scout
              </p>
            </div>
          </div>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </button>
          )}
        </header>

        {/* Indicador de etapas */}
        <StepIndicator step={step} />

        <div className="mt-6">
          {step === "upload" && <VideoUploader onSelect={handleSelect} />}

          {step === "processing" && (
            <ProcessingView
              videoName={videoName}
              progress={progress}
              phase={phase}
              error={error}
              onRetry={retry}
              onReset={resetAll}
            />
          )}

          {step === "validation" && analysis && videoUrl && (
            <ValidationView
              videoUrl={videoUrl}
              videoDuration={analysis.videoDuration}
              rallies={analysis.rallies}
              actions={analysis.actions}
              players={analysis.players}
              onUpdateAction={updateAction}
              onDeleteAction={deleteAction}
              onAddAction={addAction}
              onUpdatePlayer={updatePlayer}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onGenerateScout={() => setStep("scout")}
            />
          )}

          {step === "scout" && analysis && (
            <ScoutReport
              actions={analysis.actions}
              players={analysis.players}
              onBackToValidation={() => setStep("validation")}
            />
          )}
        </div>

        {step !== "upload" && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={resetAll}
              className="text-xs text-slate-500 underline hover:text-slate-300"
            >
              Analisar outro vídeo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "processing", label: "Processamento IA" },
    { key: "validation", label: "Validação" },
    { key: "scout", label: "Scout" },
  ]
  const currentIndex = steps.findIndex((s) => s.key === step)

  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const active = i === currentIndex
        const done = i < currentIndex
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-blue-600 text-white"
                    : done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-sm sm:inline ${
                  active ? "text-slate-100" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 ${done ? "bg-emerald-500/40" : "bg-slate-800"}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
