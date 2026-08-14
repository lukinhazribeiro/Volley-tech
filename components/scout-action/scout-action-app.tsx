"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ActionDataEntry } from "./action-data-entry"
import { type ActionMatchConfig, createDefaultConfig } from "@/lib/scout-action/config"
import { listActionMatches, deleteActionMatch, type ActionMatch } from "@/lib/scout-action/storage"
import { exportActionMatchPdf } from "@/lib/scout-action/export-pdf"

export function ScoutActionApp() {
  const router = useRouter()
  const [matches, setMatches] = useState<ActionMatch[]>([])
  // Config da sessão atual. Trocá-la (junto do key) reinicia o painel do zero.
  const [config, setConfig] = useState<ActionMatchConfig>(() => createDefaultConfig())
  const [sessionKey, setSessionKey] = useState(0)

  const refresh = useCallback(() => setMatches(listActionMatches()), [])
  useEffect(() => {
    refresh()
  }, [refresh])

  // Ao encerrar um scout: atualiza a lista de salvos e recomeça um painel limpo.
  function handleFinish() {
    refresh()
    setConfig(createDefaultConfig())
    setSessionKey((k) => k + 1)
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este scout? Esta ação não pode ser desfeita.")) return
    deleteActionMatch(id)
    refresh()
  }

  return (
    <ActionDataEntry
      key={sessionKey}
      config={config}
      savedMatches={matches}
      onExportPdf={(m) => exportActionMatchPdf(m)}
      onDeleteMatch={handleDelete}
      onFinish={handleFinish}
      onExit={() => router.push("/scout-volleyball")}
    />
  )
}
