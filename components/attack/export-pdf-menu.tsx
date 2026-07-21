"use client"

import { useState } from "react"
import { Download, ChevronDown } from "lucide-react"
import type { Team, TeamNames } from "@/lib/attack/volley-stats"

/**
 * Botão "PDF" com menu para escolher exportar AMBAS as equipes ou somente uma.
 * Reutilizado nas listas de histórico do Attack Position.
 */
export function ExportPdfMenu({
  teamNames,
  onExport,
  className = "",
}: {
  teamNames: TeamNames
  onExport: (teams: Team[]) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const choose = (teams: Team[]) => {
    setOpen(false)
    onExport(teams)
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" />
        PDF
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50"
              onClick={() => choose(["A", "B"])}
            >
              Ambas as equipes
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full truncate px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50"
              onClick={() => choose(["A"])}
            >
              Somente {teamNames.A}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full truncate px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50"
              onClick={() => choose(["B"])}
            >
              Somente {teamNames.B}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
