"use client"

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type SyntheticEvent,
} from "react"
import { Gauge, Pause, Play, RotateCcw } from "lucide-react"
import { formatTime } from "@/lib/video-scout/types"

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const

export interface VideoPlayerHandle {
  seek: (time: number) => void
  play: () => void
  pause: () => void
}

interface VideoPlayerProps {
  src: string
  onTimeUpdate?: (time: number) => void
  onDuration?: (duration: number) => void
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onDuration }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [playing, setPlaying] = useState(false)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speed, setSpeed] = useState(1)

    function changeSpeed(value: number) {
      setSpeed(value)
      if (videoRef.current) videoRef.current.playbackRate = value
    }

    useImperativeHandle(ref, () => ({
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
        }
      },
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
    }))

    function handleTime(e: SyntheticEvent<HTMLVideoElement>) {
      const t = e.currentTarget.currentTime
      setCurrent(t)
      onTimeUpdate?.(t)
    }

    function togglePlay() {
      const v = videoRef.current
      if (!v) return
      if (v.paused) v.play()
      else v.pause()
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
        <video
          ref={videoRef}
          src={src}
          className="aspect-video w-full bg-black"
          onTimeUpdate={handleTime}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            setDuration(d)
            onDuration?.(d)
            e.currentTarget.playbackRate = speed
          }}
          playsInline
        />
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => {
              const t = Number(e.target.value)
              if (videoRef.current) videoRef.current.currentTime = t
              setCurrent(t)
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-blue-500"
            aria-label="Linha de reprodução do vídeo"
          />

          <span className="shrink-0 font-mono text-xs text-slate-400">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>

        {/* Controle de velocidade de reprodução */}
        <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0 text-xs text-slate-400">Velocidade</span>
          <div className="flex flex-wrap gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                className={`rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors ${
                  speed === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                aria-pressed={speed === s}
                aria-label={`Velocidade ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  },
)
