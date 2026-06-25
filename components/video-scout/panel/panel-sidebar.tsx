"use client"

import { Users } from "lucide-react"
import type { TeamSide } from "@/lib/video-scout/types"

interface PanelSidebarProps {
  teamAName: string
  teamBName: string
  onEditTeam: (side: TeamSide) => void
}

export function PanelSidebar({ teamAName, teamBName, onEditTeam }: PanelSidebarProps) {
  const teams: { side: TeamSide; name: string; dot: string }[] = [
    { side: "casa", name: teamAName, dot: "bg-blue-500" },
    { side: "adversario", name: teamBName, dot: "bg-pink-500" },
  ]

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-[#0b0f1c] lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/40">
          <span className="text-lg font-bold text-violet-400">V</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-slate-100">VOLLEY</p>
          <p className="-mt-0.5 text-sm font-bold tracking-wide text-violet-400">TECH</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Equipes
        </p>
        {teams.map((t) => (
          <button
            key={t.side}
            type="button"
            onClick={() => onEditTeam(t.side)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden="true" />
            <span className="truncate">{t.name}</span>
          </button>
        ))}
        <p className="mt-2 px-3 text-[11px] leading-relaxed text-slate-600">
          Toque em uma equipe para editar nomes e números dos jogadores.
        </p>
      </nav>
    </aside>
  )
}
