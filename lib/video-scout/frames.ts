// Extração de frames do vídeo no navegador.
// Usado para enviar quadros amostrados ao modelo de visão (IA real).

export interface ExtractedFrame {
  /** Momento do frame em segundos. */
  t: number
  /** Imagem em data URL (JPEG). */
  dataUrl: string
}

export interface ExtractOptions {
  /** Número máximo de frames a amostrar. */
  maxFrames?: number
  /** Intervalo mínimo entre frames, em segundos. */
  minInterval?: number
  /** Largura alvo dos frames (a altura é proporcional). */
  width?: number
  /** Qualidade JPEG entre 0 e 1. */
  quality?: number
  /** Callback de progresso (0 a 1). */
  onProgress?: (ratio: number) => void
}

/** Aguarda um evento único do elemento de vídeo. */
function once(el: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      el.removeEventListener(event, handler)
      resolve()
    }
    el.addEventListener(event, handler)
  })
}

/**
 * Extrai frames amostrados de um arquivo de vídeo.
 * Os frames são distribuídos uniformemente ao longo da duração.
 */
export async function extractFrames(
  file: File,
  opts: ExtractOptions = {},
): Promise<{ frames: ExtractedFrame[]; duration: number }> {
  const {
    maxFrames = 24,
    minInterval = 1,
    width = 480,
    quality = 0.6,
    onProgress,
  } = opts

  const url = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  video.crossOrigin = "anonymous"
  video.src = url

  try {
    await once(video, "loadedmetadata")
    const duration = Number.isFinite(video.duration) ? video.duration : 0

    if (!duration || duration <= 0) {
      return { frames: [], duration: 0 }
    }

    // Define quantos frames e o intervalo entre eles.
    const idealCount = Math.min(maxFrames, Math.max(2, Math.floor(duration / minInterval)))
    const interval = duration / (idealCount + 1)

    const targetWidth = width
    const ratio = video.videoHeight ? video.videoHeight / video.videoWidth : 9 / 16
    const targetHeight = Math.round(targetWidth * ratio)

    const canvas = document.createElement("canvas")
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return { frames: [], duration }

    const frames: ExtractedFrame[] = []

    for (let i = 1; i <= idealCount; i++) {
      const t = Math.min(duration - 0.05, interval * i)
      video.currentTime = t
      await once(video, "seeked")
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
      frames.push({ t: Number(t.toFixed(2)), dataUrl: canvas.toDataURL("image/jpeg", quality) })
      onProgress?.(i / idealCount)
    }

    return { frames, duration }
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute("src")
    video.load()
  }
}
