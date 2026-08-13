"use client"

import { useState, useEffect } from "react"
import { Smartphone, Users, History } from "lucide-react"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import MatchDataEntryPage from "@/components/scout/pages/match-data-entry-page"
import MatchHistoryPage from "@/components/scout/pages/match-history-page"
import RoomConnectionPage from "@/components/scout/pages/room-connection-page"
import { syncManager } from "@/lib/scout/sync-manager"

export default function ScoutApp() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<"mode-select" | "history" | "match" | "room">("mode-select")
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem("scoutvolley_user") || localStorage.getItem("volleyball_tech_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleModeSelect = (mode: "individual" | "synced") => {
    if (mode === "individual") {
      setView("match")
      setIsSynced(false)
    } else {
      setView("room")
      setIsSynced(true)
    }
  }

  const handleRoomCreated = (newRoomId: string) => {
    setRoomId(newRoomId)
    setView("match")
  }

  const handleRoomJoined = (newRoomId: string) => {
    setRoomId(newRoomId)
    setView("match")
  }

  useEffect(() => {
    return () => {
      if (roomId) {
        syncManager.leaveRoom()
      }
    }
  }, [roomId])

  if (view === "mode-select") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-center">
              <VolleyTechLogo className="h-14 w-14 text-white mb-3" />
              <h1 className="text-4xl font-bold mb-2">Scout Volleyball</h1>
              <p className="text-sm text-orange-100">
                {user ? `Bem-vindo, ${user.name || user.email}` : "by Lucas Ribeiro da Cunha"}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleModeSelect("individual")}
                className="group w-full p-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Smartphone className="w-7 h-7" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Coleta Individual</span>
                  <span className="block text-sm text-orange-100">Coleta de dados em um único aparelho</span>
                </span>
              </button>

              <button
                onClick={() => handleModeSelect("synced")}
                className="group w-full p-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Users className="w-7 h-7" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Coleta Sincronizada</span>
                  <span className="block text-sm text-orange-50">Até 3 aparelhos conectados em tempo real</span>
                </span>
              </button>

              <button
                onClick={() => setView("history")}
                className="group w-full p-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg border border-orange-500/40 hover:border-orange-500 transition-all hover:-translate-y-1 active:translate-y-0 text-left flex items-center gap-4"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <History className="w-7 h-7 text-orange-400" />
                </span>
                <span>
                  <span className="block text-xl font-bold mb-1">Histórico</span>
                  <span className="block text-sm text-slate-300">Visualizar partidas anteriores</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === "history") {
    return (
      <div>
        <button
          onClick={() => setView("mode-select")}
          className="fixed top-2 right-2 px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md shadow-lg z-50"
        >
          Menu
        </button>
        <MatchHistoryPage />
      </div>
    )
  }

  if (view === "room") {
    return (
      <RoomConnectionPage
        onRoomCreated={handleRoomCreated}
        onRoomJoined={handleRoomJoined}
        onBack={() => setView("mode-select")}
      />
    )
  }

  return (
    <div>
      <button
        onClick={() => {
          if (roomId) {
            syncManager.leaveRoom()
            setRoomId(null)
          }
          setView("mode-select")
        }}
        className="fixed top-2 right-2 px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md shadow-lg z-50"
      >
        Menu
      </button>
      <MatchDataEntryPage roomId={roomId} isSynced={isSynced} />
    </div>
  )
}
