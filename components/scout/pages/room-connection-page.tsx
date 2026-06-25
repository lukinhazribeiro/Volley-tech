"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/scout/ui/button"
import { Card } from "@/components/scout/ui/card"
import { Input } from "@/components/scout/ui/input"
import { syncManager, type DeviceInfo } from "@/lib/scout/sync-manager"
import { Copy, Check, Wifi, WifiOff } from 'lucide-react'

interface RoomConnectionPageProps {
  onRoomCreated: (roomId: string) => void
  onRoomJoined: (roomId: string) => void
  onBack: () => void
}

export default function RoomConnectionPage({ onRoomCreated, onRoomJoined, onBack }: RoomConnectionPageProps) {
  const [mode, setMode] = useState<"create" | "join" | null>(null)
  const [roomId, setRoomId] = useState("")
  const [inputRoomId, setInputRoomId] = useState("")
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([])
  const [copied, setCopied] = useState(false)
  const [connectionError, setConnectionError] = useState("")

  // Listen for device changes
  useEffect(() => {
    if (!roomId) return

    const unsubscribe = syncManager.onMessage((message) => {
      if (message.type === "device-join" || message.type === "device-leave") {
        const devices = syncManager.getConnectedDevices()
        setConnectedDevices(devices)
      }
    })

    return unsubscribe
  }, [roomId])

  const handleCreateRoom = () => {
    const newRoomId = syncManager.createRoom()
    setRoomId(newRoomId)
    setMode("create")
    setConnectedDevices(syncManager.getConnectedDevices())
  }

  const handleJoinRoom = () => {
    if (!inputRoomId.trim()) {
      setConnectionError("Por favor, insira um ID de sala")
      return
    }

    const success = syncManager.joinRoom(inputRoomId.trim())
    if (success) {
      setRoomId(inputRoomId.trim())
      setMode("join")
      setConnectedDevices(syncManager.getConnectedDevices())
      setConnectionError("")
      onRoomJoined(inputRoomId.trim())
    } else {
      setConnectionError("Sala cheia ou não encontrada. Máximo 3 dispositivos por sala.")
    }
  }

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartMatch = () => {
    if (mode === "create") {
      onRoomCreated(roomId)
    } else {
      onRoomJoined(roomId)
    }
  }

  if (!mode) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white shadow-2xl border border-orange-100">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Scout Volleyball</h1>
            <p className="text-slate-600">by Lucas Ribeiro da Cunha</p>
            <p className="text-orange-600 text-sm mt-2 font-medium">Conexão em Tempo Real</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Wifi className="w-5 h-5" />
              Criar Nova Sala
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-600">ou</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ID da Sala</label>
              <Input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Cole o ID da sala aqui"
                className="w-full"
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              disabled={!inputRoomId.trim()}
            >
              <Wifi className="w-5 h-5" />
              Conectar à Sala
            </Button>

            {connectionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {connectionError}
              </div>
            )}

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-slate-700">
                <strong>Dica:</strong> Crie uma sala no primeiro aparelho e compartilhe o ID com os outros dispositivos
                para sincronização em tempo real.
              </p>
            </div>

            <Button onClick={onBack} variant="outline" className="w-full bg-transparent">
              Voltar ao Menu Principal
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl border border-orange-100">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Scout Volleyball</h1>
          <p className="text-slate-600">ID da Sala: {roomId.substring(0, 15)}...</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Compartilhe este ID:</label>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 p-3 bg-slate-100 rounded-lg font-mono text-sm break-all">{roomId}</div>
            <Button onClick={handleCopyRoomId} className="px-3 bg-slate-600 hover:bg-slate-700 text-white" size="sm">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Dispositivos Conectados ({connectedDevices.length}/3)
          </label>
          <div className="space-y-2">
            {connectedDevices.map((device) => (
              <div
                key={device.deviceId}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <Wifi
                  className={`w-4 h-4 ${device.deviceId === syncManager.getDeviceId() ? "text-green-600" : "text-orange-600"}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {device.name} {device.deviceId === syncManager.getDeviceId() ? "(Este)" : ""}
                  </p>
                  <p className="text-xs text-slate-600">{new Date(device.joinedAt).toLocaleTimeString("pt-BR")}</p>
                </div>
              </div>
            ))}

            {connectedDevices.length < 3 && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <WifiOff className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-600">Aguardando novos dispositivos...</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleStartMatch}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg"
          >
            Iniciar Coleta de Dados
          </Button>

          <Button
            onClick={() => {
              syncManager.leaveRoom()
              setMode(null)
              setRoomId("")
              setInputRoomId("")
            }}
            variant="outline"
            className="w-full"
          >
            Voltar
          </Button>

          <Button
            onClick={() => {
              syncManager.leaveRoom()
              onBack()
            }}
            variant="outline"
            className="w-full text-slate-700"
          >
            Menu Principal
          </Button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-slate-700">
            <strong>Sincronização:</strong> Todos os dados de ações são sincronizados em tempo real entre os
            dispositivos conectados.
          </p>
        </div>
      </Card>
    </div>
  )
}
