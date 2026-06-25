'use client'

import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"

export function AppHeader() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg mb-6">
      <div className="text-center flex flex-col items-center">
        <VolleyTechLogo className="h-14 w-14 text-white mb-3" />
        <h1 className="text-4xl font-bold mb-2">Scout Volleyball</h1>
        <p className="text-sm text-orange-100">by Lucas Ribeiro da Cunha</p>
      </div>
    </div>
  )
}
