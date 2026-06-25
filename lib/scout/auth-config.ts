export const CATEGORIES = [
  { id: "sub13", label: "Sub 13", minAge: 0, maxAge: 13 },
  { id: "sub15", label: "Sub 15", minAge: 13, maxAge: 15 },
  { id: "sub17", label: "Sub 17", minAge: 15, maxAge: 17 },
  { id: "sub19", label: "Sub 19", minAge: 17, maxAge: 19 },
  { id: "sub21", label: "Sub 21", minAge: 19, maxAge: 21 },
  { id: "adult", label: "Adulto", minAge: 21, maxAge: 120 },
] as const

export type Category = (typeof CATEGORIES)[number]["id"]

export interface User {
  id: string
  email: string
  name: string
  image?: string
  category: Category
  createdAt: Date
}

export interface Match {
  id: string
  userId: string
  teamA: string
  teamB: string
  category: Category
  sets: MatchSet[]
  createdAt: Date
  completedAt?: Date
}

export interface MatchSet {
  number: number
  teamAScore: number
  teamBScore: number
  winner: "A" | "B"
  completedAt: Date
}
