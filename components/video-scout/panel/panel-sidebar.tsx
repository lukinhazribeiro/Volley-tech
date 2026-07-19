"use client"

import { Users, X } from "lucide-react"
import type { TeamSide } from "@/lib/video-scout/types"

interface PanelSidebarProps {
  open: boolean
  onClose: () => void
  teamAName: string
  teamBName: string
  onEditTeam: (side: TeamSide) => void
}

export function PanelSidebar({ open, onClose, teamAName, teamBName, onEditTeam }: PanelSidebarProps) {
  const teams: { side: TeamSide; name: string; dot: string }[] = [
    { side: "casa", name: teamAName, dot: "bg-blue-500" },
    { side: "adversario", name: teamBName, dot: "bg-pink-500" },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      {/* Gaveta */}
      <aside className="relative flex h-full w-64 flex-col border-r border-orange-100 bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <img
              src="/volley-tech-logo.png"
              alt="Volley Tech"
              className="h-9 w-9 shrink-0 object-contain"
              draggable={false}
            />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide text-slate-800">VOLLEY</p>
              <p className="-mt-0.5 text-sm font-bold tracking-wide text-orange-600">TECH</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          <p className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Equipes
          </p>
          {teams.map((t) => (
            <button
              key={t.side}
              type="button"
              onClick={() => onEditTeam(t.side)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden="true" />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
          <p className="mt-2 px-3 text-[11px] leading-relaxed text-slate-400">
            Toque em uma equipe para editar nomes e números dos jogadores.
          </p>
        </nav>
      </aside>
    </div>
  )
}
