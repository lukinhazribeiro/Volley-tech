"use client"

import type { ReactNode } from "react"

export type Tone = "neutral" | "primary" | "positive" | "negative" | "info" | "warning"

const toneClasses: Record<Tone, string> = {
  neutral:
    "bg-white text-slate-800 border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 active:bg-orange-100",
  primary: "bg-orange-600 text-white border-2 border-orange-600 hover:bg-orange-700 hover:border-orange-700",
  positive: "bg-emerald-600 text-white border-2 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700",
  negative: "bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700",
  info: "bg-sky-600 text-white border-2 border-sky-600 hover:bg-sky-700 hover:border-sky-700",
  warning: "bg-amber-500 text-white border-2 border-amber-500 hover:bg-amber-600 hover:border-amber-600",
}

interface OptionButtonProps {
  onClick: () => void
  tone?: Tone
  className?: string
  children: ReactNode
  subLabel?: string
}

/** Botão de opção grande para o coletor: alvo de toque amplo e visual claro. */
export function OptionButton({ onClick, tone = "neutral", className = "", children, subLabel }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-3 text-lg font-bold shadow-sm transition-all duration-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${toneClasses[tone]} ${className}`}
    >
      <span className="text-balance text-center leading-tight">{children}</span>
      {subLabel ? <span className="text-xs font-medium opacity-80">{subLabel}</span> : null}
    </button>
  )
}

interface NumberButtonProps {
  onClick: () => void
  value: number | string
  className?: string
}

/** Botão de número grande para grades de jogadores. */
export function NumberButton({ onClick, value, className = "" }: NumberButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-square min-h-[56px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-2xl font-extrabold text-slate-800 shadow-sm transition-all duration-100 hover:border-orange-400 hover:bg-orange-50 active:scale-[0.95] active:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${className}`}
    >
      {value}
    </button>
  )
}

/** Cabeçalho padronizado das faces do coletor. */
export function FaceHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-balance text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
    </div>
  )
}
