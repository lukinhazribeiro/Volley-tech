"use client"

import { useState, useEffect } from "react"
import { syncManager, type DeviceInfo } from "@/lib/scout/sync-manager"
import { Wifi, WifiOff } from "lucide-react"

interface ConnectionStatusProps {
  roomId?: string | null
  isSynced?: boolean
}

export default function ConnectionStatus({ roomId, isSynced }: ConnectionStatusProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isSynced || !roomId) {
      setIsConnected(false)
      return
    }

    setIsConnected(true)
    setDevices(syncManager.getConnectedDevices())

    const unsubscribe = syncManager.onMessage((message) => {
      if (message.type === "device-join" || message.type === "device-leave") {
        setDevices(syncManager.getConnectedDevices())
      }
    })

    return unsubscribe
  }, [isSynced, roomId])

  if (!isSynced || !roomId) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg p-3 border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          {isConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
          <span className="text-sm font-medium text-slate-900">{devices.length}/3 Dispositivos</span>
        </div>
        <div className="text-xs space-y-1">
          {devices.map((device) => (
            <div key={device.deviceId} className="text-slate-600">
              {device.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
