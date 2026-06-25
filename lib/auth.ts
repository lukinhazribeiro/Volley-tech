"use client"

export const AUTH_KEY = "volleyball_tech_user"

export interface AuthUser {
  id: string
  email: string
  name: string
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  // keep legacy Scout key in sync so the Scout app reads the same session
  localStorage.setItem("scoutvolley_user", JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem("scoutvolley_user")
}
