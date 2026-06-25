"use client"

import type { Set } from "@/lib/scout/set-manager"
import { Card } from "@/components/scout/ui/card"
import { Badge } from "@/components/scout/ui/badge"

interface SetDisplayProps {
  sets: Set[]
  currentSet: Set
  teamAName: string
  teamBName: string
}

export default function SetDisplay({ sets, currentSet, teamAName, teamBName }: SetDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Sets:</span>
        <div className="flex gap-2">
          {sets.map((set, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <Badge variant={set.winner === "A" ? "default" : "secondary"} className="text-xs">
                {set.teamAScore}
              </Badge>
              <span className="text-xs text-muted-foreground">-</span>
              <Badge variant={set.winner === "B" ? "default" : "secondary"} className="text-xs">
                {set.teamBScore}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">{teamAName}</p>
            <p className="text-3xl font-bold text-blue-600">{currentSet.teamAScore}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Set {currentSet.number}</p>
            <p className="text-sm font-medium text-muted-foreground">em andamento</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{teamBName}</p>
            <p className="text-3xl font-bold text-red-600">{currentSet.teamBScore}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
