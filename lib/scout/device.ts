// Identidade do dispositivo/navegador atual, compartilhada por todos os Scouts.
//
// Usada para a transmissão ao vivo por conta: cada dispositivo tem um id estável
// e um rótulo amigável, para que os espectadores saibam quem está coletando.
// As chaves são as mesmas que o Scout View já usava, para não trocar o id de
// quem já usa o sistema.

const DEVICE_ID_KEY = "volleytech_device_id_v1"
const DEVICE_LABEL_KEY = "volleytech_device_label_v1"

/** Identificador estável do dispositivo/navegador atual. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server"
  let id = window.localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/** Rótulo amigável do dispositivo (para identificar quem está coletando). */
export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "Dispositivo"
  const saved = window.localStorage.getItem(DEVICE_LABEL_KEY)
  if (saved) return saved

  const ua = navigator.userAgent
  let label = "Dispositivo"
  if (/iPhone|iPad|iPod/i.test(ua)) label = "iPhone/iPad"
  else if (/Android/i.test(ua)) label = "Android"
  else if (/Macintosh|Mac OS X/i.test(ua)) label = "Mac"
  else if (/Windows/i.test(ua)) label = "Windows"
  else if (/Linux/i.test(ua)) label = "Linux"

  window.localStorage.setItem(DEVICE_LABEL_KEY, label)
  return label
}

/** Permite ao usuário renomear este dispositivo (ex.: "Tablet da mesa"). */
export function setDeviceLabel(label: string): void {
  if (typeof window === "undefined") return
  const trimmed = label.trim()
  if (trimmed) window.localStorage.setItem(DEVICE_LABEL_KEY, trimmed)
}
