"use client"

import { useState } from "react"
import { Play, BarChart3, TrendingUp } from "lucide-react"
import { Button } from "@/components/attack/ui/button"
import { Card, CardContent } from "@/components/attack/ui/card"
import RegisterPlays from "@/components/attack/register-plays"
import StatsDashboard from "@/components/attack/stats-dashboard"
import PerformanceAnalysis from "@/components/attack/performance-analysis"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"

export default function AttackApp() {
  const [activeView, setActiveView] = useState<"home" | "register" | "dashboard" | "performance">("home")

  if (activeView === "register") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={() => setActiveView("home")} className="mb-6">
            ← Voltar
          </Button>
          <RegisterPlays />
        </div>
      </div>
    )
  }

  if (activeView === "dashboard") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={() => setActiveView("home")} className="mb-6">
            ← Voltar
          </Button>
          <StatsDashboard />
        </div>
      </div>
    )
  }

  if (activeView === "performance") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={() => setActiveView("home")} className="mb-6">
            ← Voltar
          </Button>
          <PerformanceAnalysis />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-center">
            <VolleyTechLogo className="h-14 w-14 text-white mb-3" />
            <h1 className="text-4xl font-bold mb-2">Attack Position</h1>
            <p className="text-sm text-orange-100">Análise estatística de ataque para levantadores</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setActiveView("register")}
              className="group w-full p-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Play className="w-7 h-7" />
              </span>
              <span>
                <span className="block text-xl font-bold mb-1">Registrar Jogadas</span>
                <span className="block text-sm text-orange-100">Colete jogadas em tempo real com o coletor por fases</span>
              </span>
            </button>

            <button
              onClick={() => setActiveView("dashboard")}
              className="group w-full p-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <BarChart3 className="w-7 h-7" />
              </span>
              <span>
                <span className="block text-xl font-bold mb-1">Ver Estatísticas</span>
                <span className="block text-sm text-orange-50">Dashboard com incidência por posição e tipo de ataque</span>
              </span>
            </button>

            <button
              onClick={() => setActiveView("performance")}
              className="group w-full p-6 bg-white hover:bg-orange-50 text-slate-900 rounded-lg shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                <TrendingUp className="w-7 h-7 text-orange-600" />
              </span>
              <span>
                <span className="block text-xl font-bold mb-1">Análise de Performance</span>
                <span className="block text-sm text-slate-500">
                  Histórico de jogos e desempenho das atletas entre todas as partidas
                </span>
              </span>
            </button>
          </div>

          <Card className="bg-secondary/50 border-border mt-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-foreground">O que você pode rastrear:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-muted-foreground">
                <div>
                  <h4 className="font-semibold text-primary mb-2">Posições de Levantamento:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Ponta (Posição 4)</li>
                    <li>• Meio (Posição 3)</li>
                    <li>• Oposto (Posição 2)</li>
                    <li>• Fundo Pipe (Posição 6)</li>
                    <li>• Fundo 1 (Posição 1)</li>
                    <li>• Segunda Bola</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Tipos de Ataque:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Diagonal Maior</li>
                    <li>• Diagonal Menor</li>
                    <li>• Paralela</li>
                    <li>• Paragonal</li>
                    <li>• Bloqueado</li>
                    <li>• Pingo</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
