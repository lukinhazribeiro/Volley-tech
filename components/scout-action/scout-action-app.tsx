"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ActionDataEntry } from "./action-data-entry"
import { type ActionMatchConfig, createDefaultConfig } from "@/lib/scout-action/config"
import type { ActionMatch } from "@/lib/scout-action/storage"
import {
  loadActionHistory,
  deleteActionFromCloud,
  subscribeToActionHistory,
  migrateLocalActionHistory,
} from "@/lib/scout-action/cloud-history"
import { exportActionMatchPdf } from "@/lib/scout-action/export-pdf"

export function ScoutActionApp() {
  const router = useRouter()
  const [matches, setMatches] = useState<ActionMatch[]>([])
  // Config da sessão atual. Trocá-la (junto do key) reinicia o painel do zero.
  const [config, setConfig] = useState<ActionMatchConfig>(() => createDefaultConfig())
  const [sessionKey, setSessionKey] = useState(0)

  const refresh = useCallback(async () => {
    setMatches(await loadActionHistory())
  }, [])

  // Carrega da nuvem, migra os jogos locais antigos (uma vez) e escuta mudanças
  // feitas em qualquer dispositivo logado na mesma conta.
  useEffect(() => {
    let active = true
    ;(async () => {
      await migrateLocalActionHistory()
      if (active) await refresh()
    })()
    const unsubscribe = subscribeToActionHistory(() => {
      void refresh()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [refresh])

  // Ao encerrar um scout: atualiza a lista de salvos e recomeça um painel limpo.
  function handleFinish() {
    void refresh()
    setConfig(createDefaultConfig())
    setSessionKey((k) => k + 1)
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este scout? Esta ação não pode ser desfeita.")) return
    setMatches(await deleteActionFromCloud(id))
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
