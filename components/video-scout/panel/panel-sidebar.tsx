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
    <aside className="hidden w-56 shrink-0 flex-col border-r border-orange-100 bg-white lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 ring-1 ring-orange-200">
          <span className="text-lg font-bold text-orange-600">V</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-slate-800">VOLLEY</p>
          <p className="-mt-0.5 text-sm font-bold tracking-wide text-orange-600">TECH</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
  )
}
