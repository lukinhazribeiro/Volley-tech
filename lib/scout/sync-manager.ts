// Real-time sync manager using BroadcastChannel API for multi-device synchronization
// Supports up to 3 devices connected to the same room

interface SyncMessage {
  type: "action" | "score-update" | "set-update" | "device-join" | "device-leave" | "sync-request"
  roomId: string
  deviceId: string
  data: any
  timestamp: number
}

interface DeviceInfo {
  deviceId: string
  name: string
  joinedAt: number
}

class SyncManager {
  private roomId = ""
  private deviceId = ""
  private channel: BroadcastChannel | null = null
  private connectedDevices: Map<string, DeviceInfo> = new Map()
  private listeners: ((message: SyncMessage) => void)[] = []
  private maxDevices = 3
  private initialized = false

  constructor() {
    // This will be called when first needed
  }

  private ensureInitialized(): void {
    if (this.initialized) return
    if (typeof window === "undefined") return // Skip on server
    this.deviceId = this.generateDeviceId()
    this.initialized = true
  }

  private generateDeviceId(): string {
    if (typeof window === "undefined") return `device_${Date.now()}`
    const stored = localStorage.getItem("scoutvoley_device_id")
    if (stored) return stored
    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("scoutvoley_device_id", id)
    return id
  }

  createRoom(): string {
    const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.joinRoom(newRoomId)
    return newRoomId
  }

  joinRoom(roomId: string): boolean {
    this.ensureInitialized()
    // Check if room already has max devices
    const storedDevices = localStorage.getItem(`${roomId}_devices`)
    const devices = storedDevices ? JSON.parse(storedDevices) : {}

    if (Object.keys(devices).length >= this.maxDevices && !devices[this.deviceId]) {
      return false
    }

    this.roomId = roomId
    this.channel = new BroadcastChannel(roomId)

    // Register this device
    devices[this.deviceId] = {
      deviceId: this.deviceId,
      name: `Device ${Object.keys(devices).length + 1}`,
      joinedAt: Date.now(),
    }
    localStorage.setItem(`${roomId}_devices`, JSON.stringify(devices))
    this.connectedDevices = new Map(Object.entries(devices) as any)

    // Listen for messages
    this.channel.onmessage = (event) => {
      const message: SyncMessage = event.data
      if (message.roomId === this.roomId) {
        this.notifyListeners(message)
      }
    }

    // Announce join
    this.broadcast({
      type: "device-join",
      roomId: this.roomId,
      deviceId: this.deviceId,
      data: devices[this.deviceId],
      timestamp: Date.now(),
    })

    return true
  }

  leaveRoom(): void {
    if (!this.roomId || !this.channel) return

    // Remove this device from the room
    const devices = localStorage.getItem(`${this.roomId}_devices`)
    if (devices) {
      const parsed = JSON.parse(devices)
      delete parsed[this.deviceId]
      localStorage.setItem(`${this.roomId}_devices`, JSON.stringify(parsed))
    }

    // Announce leave
    this.broadcast({
      type: "device-leave",
      roomId: this.roomId,
      deviceId: this.deviceId,
      data: null,
      timestamp: Date.now(),
    })

    this.channel.close()
    this.channel = null
    this.roomId = ""
  }

  broadcast(message: Omit<SyncMessage, "roomId" | "deviceId" | "timestamp">): void {
    if (!this.channel || !this.roomId) return

    const fullMessage: SyncMessage = {
      ...message,
      roomId: this.roomId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
    }

    this.channel.postMessage(fullMessage)
    this.notifyListeners(fullMessage)
  }

  onMessage(callback: (message: SyncMessage) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notifyListeners(message: SyncMessage): void {
    this.listeners.forEach((listener) => listener(message))
  }

  getConnectedDevices(): DeviceInfo[] {
    return Array.from(this.connectedDevices.values())
  }

  getRoomId(): string {
    return this.roomId
  }

  getDeviceId(): string {
    this.ensureInitialized()
    return this.deviceId
  }

  canAddDevice(): boolean {
    return this.connectedDevices.size < this.maxDevices
  }

  isConnected(): boolean {
    return !!this.roomId && !!this.channel
  }
}

let _syncManager: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!_syncManager) {
    _syncManager = new SyncManager()
  }
  return _syncManager
}

export const syncManager = {
  get leaveRoom() {
    return getSyncManager().leaveRoom.bind(getSyncManager())
  },
  get createRoom() {
    return getSyncManager().createRoom.bind(getSyncManager())
  },
  get joinRoom() {
    return getSyncManager().joinRoom.bind(getSyncManager())
  },
  get onMessage() {
    return getSyncManager().onMessage.bind(getSyncManager())
  },
  get broadcast() {
    return getSyncManager().broadcast.bind(getSyncManager())
  },
  get getConnectedDevices() {
    return getSyncManager().getConnectedDevices.bind(getSyncManager())
  },
  get getRoomId() {
    return getSyncManager().getRoomId.bind(getSyncManager())
  },
  get getDeviceId() {
    return getSyncManager().getDeviceId.bind(getSyncManager())
  },
  get canAddDevice() {
    return getSyncManager().canAddDevice.bind(getSyncManager())
  },
  get isConnected() {
    return getSyncManager().isConnected.bind(getSyncManager())
  },
}

export type { SyncMessage, DeviceInfo }
