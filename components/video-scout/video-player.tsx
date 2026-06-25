"use client"

import {
  forwardRef,
  useEffect,
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

/** Extrai o ID de um vídeo do YouTube a partir de várias formas de URL. */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

// Carrega o script da IFrame API do YouTube uma única vez.
let ytApiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if ((window as any).YT?.Player) return Promise.resolve()
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onDuration }, ref) {
    const youTubeId = parseYouTubeId(src)
    if (youTubeId) {
      return (
        <YouTubePlayer
          ref={ref}
          videoId={youTubeId}
          onTimeUpdate={onTimeUpdate}
          onDuration={onDuration}
        />
      )
    }
    return (
      <HtmlVideoPlayer
        ref={ref}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onDuration={onDuration}
      />
    )
  },
)

// ---------- Player de arquivo / link direto (mp4, etc.) ----------

const HtmlVideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function HtmlVideoPlayer({ src, onTimeUpdate, onDuration }, ref) {
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
        if (videoRef.current) videoRef.current.currentTime = time
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
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-black">
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
        <div className="flex items-center gap-3 bg-white px-3 py-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-700"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-600"
            aria-label="Linha de reprodução do vídeo"
          />

          <span className="shrink-0 font-mono text-xs text-slate-500">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 border-t border-orange-100 bg-white px-3 py-2">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="shrink-0 text-xs text-slate-500">Velocidade</span>
          <div className="flex flex-wrap gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                className={`rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors ${
                  speed === s
                    ? "bg-orange-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

// ---------- Player do YouTube (IFrame API) ----------

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (time: number) => void
  onDuration?: (duration: number) => void
}

const YouTubePlayer = forwardRef<VideoPlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onTimeUpdate, onDuration }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const pollRef = useRef<number | null>(null)
    const [playing, setPlaying] = useState(false)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speed, setSpeed] = useState(1)
    const [ready, setReady] = useState(false)

    useImperativeHandle(ref, () => ({
      seek: (time: number) => playerRef.current?.seekTo?.(time, true),
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
    }))

    useEffect(() => {
      let cancelled = false
      loadYouTubeApi().then(() => {
        if (cancelled || !containerRef.current) return
        const YT = (window as any).YT
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (e: any) => {
              setReady(true)
              const d = e.target.getDuration?.() ?? 0
              setDuration(d)
              onDuration?.(d)
            },
            onStateChange: (e: any) => {
              // 1 = playing, 2 = paused
              setPlaying(e.data === 1)
            },
          },
        })
      })
      // Atualiza o tempo atual ~4x por segundo enquanto o player existir.
      pollRef.current = window.setInterval(() => {
        const p = playerRef.current
        if (p?.getCurrentTime) {
          const t = p.getCurrentTime()
          setCurrent(t)
          onTimeUpdate?.(t)
        }
      }, 250)
      return () => {
        cancelled = true
        if (pollRef.current) window.clearInterval(pollRef.current)
        playerRef.current?.destroy?.()
        playerRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId])

    function togglePlay() {
      const p = playerRef.current
      if (!p) return
      if (playing) p.pauseVideo()
      else p.playVideo()
    }

    function changeSpeed(value: number) {
      setSpeed(value)
      playerRef.current?.setPlaybackRate?.(value)
    }

    return (
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-black">
        <div className="aspect-video w-full bg-black">
          {/* A IFrame API substitui esta div pelo iframe do player. */}
          <div ref={containerRef} className="h-full w-full" />
        </div>
        <div className="flex items-center gap-3 bg-white px-3 py-2.5">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-700 disabled:opacity-40"
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
            onClick={() => playerRef.current?.seekTo?.(0, true)}
            disabled={!ready}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
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
              playerRef.current?.seekTo?.(t, true)
              setCurrent(t)
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-600"
            aria-label="Linha de reprodução do vídeo"
          />

          <span className="shrink-0 font-mono text-xs text-slate-500">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 border-t border-orange-100 bg-white px-3 py-2">
          <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="shrink-0 text-xs text-slate-500">Velocidade</span>
          <div className="flex flex-wrap gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                className={`rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors ${
                  speed === s
                    ? "bg-orange-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
