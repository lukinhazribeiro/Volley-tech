"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/summary/ui/button"
import { Card, CardContent } from "@/components/summary/ui/card"
import { Input } from "@/components/summary/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/summary/ui/dialog"
import { ArrowLeft, Plus, Users, Pencil, Trash2, Copy, Save, X } from "lucide-react"
import {
  getTeams,
  saveTeam,
  updateTeam,
  deleteTeam,
  cloneTeam,
  type SavedTeam,
  type RosterPlayer,
} from "@/lib/summary/registry"

type EditorState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; team: SavedTeam }

const EMPTY_ROW: RosterPlayer = { number: 0, name: "" }

export function TeamsManager({ onBack }: { onBack: () => void }) {
  const [teams, setTeams] = useState<SavedTeam[]>([])
  const [editor, setEditor] = useState<EditorState>({ mode: "list" })
  const [cloneTarget, setCloneTarget] = useState<SavedTeam | null>(null)
  const [cloneName, setCloneName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    try {
      setTeams(await getTeams())
    } catch (err) {
      console.error("[v0] Erro ao carregar equipes:", err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  // ----- Editor (criar/editar) -----
  const [name, setName] = useState("")
  const [rows, setRows] = useState<RosterPlayer[]>([{ ...EMPTY_ROW }])

  const openCreate = () => {
    setName("")
    setRows([{ ...EMPTY_ROW }])
    setEditor({ mode: "create" })
  }

  const openEdit = (team: SavedTeam) => {
    setName(team.name)
    setRows(team.players.length ? team.players.map((p) => ({ ...p })) : [{ ...EMPTY_ROW }])
    setEditor({ mode: "edit", team })
  }

  const updateRow = (idx: number, field: keyof RosterPlayer, value: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: field === "number" ? Number.parseInt(value) || 0 : value } : r,
      ),
    )
  }

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }])
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx))

  const validPlayers = rows.filter((r) => r.name.trim() !== "" && r.number > 0)
  const canSave = name.trim() !== "" && validPlayers.length > 0

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      if (editor.mode === "edit") {
        await updateTeam(editor.team.id, { name, players: rows })
      } else {
        await saveTeam({ name, players: rows })
      }
      await refresh()
      setEditor({ mode: "list" })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível salvar a equipe.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (team: SavedTeam) => {
    if (!confirm(`Excluir a equipe "${team.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteTeam(team.id)
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível excluir a equipe.")
    }
  }

  const openClone = (team: SavedTeam) => {
    setCloneTarget(team)
    setCloneName(`${team.name} (cópia)`)
  }

  const confirmClone = async () => {
    if (!cloneTarget) return
    try {
      await cloneTeam(cloneTarget.id, cloneName)
      setCloneTarget(null)
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível clonar a equipe.")
    }
  }

  // ===================== LISTA =====================
  if (editor.mode === "list") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <h2 className="text-2xl font-black text-slate-900">Equipes</h2>
          </div>
          <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nova Equipe
          </Button>
        </div>

        {loading ? (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 font-medium">Carregando equipes...</p>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma equipe cadastrada ainda.</p>
              <p className="text-slate-400 text-sm mt-1">
                Cadastre uma equipe com seu elenco para carregá-la rapidamente nas partidas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {teams.map((team) => (
              <Card key={team.id} className="border border-slate-200 hover:border-orange-300 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{team.name}</h3>
                    <p className="text-sm text-slate-500">
                      {team.players.length} {team.players.length === 1 ? "atleta" : "atletas"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openClone(team)}
                      title="Clonar"
                      className="text-slate-600 hover:text-orange-600"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(team)}
                      title="Editar"
                      className="text-slate-600 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(team)}
                      title="Excluir"
                      className="text-slate-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de clonagem */}
        <Dialog open={cloneTarget !== null} onOpenChange={(open) => !open && setCloneTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clonar Equipe</DialogTitle>
              <DialogDescription>
                Cria uma cópia independente de &quot;{cloneTarget?.name}&quot; com todos os atletas. Alterações na nova
                equipe não afetam a original.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <label className="text-sm font-bold text-slate-600">Nome da nova equipe</label>
              <Input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Ex: APCEF Sub-14 2027"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloneTarget(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmClone} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Copy className="w-4 h-4 mr-1" />
                Clonar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ===================== EDITOR (criar/editar) =====================
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setEditor({ mode: "list" })}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h2 className="text-2xl font-black text-slate-900">
          {editor.mode === "edit" ? "Editar Equipe" : "Nova Equipe"}
        </h2>
      </div>

      <Card className="border border-slate-200">
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Nome da equipe</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: APCEF Sub-13 2026"
              className="mt-1 h-11 text-lg font-bold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Atletas
              </label>
              <span className="text-xs text-slate-400">{validPlayers.length} válidos</span>
            </div>
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={row.number || ""}
                    onChange={(e) => updateRow(idx, "number", e.target.value)}
                    placeholder="#"
                    className="w-16 text-center font-bold"
                  />
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(idx, "name", e.target.value)}
                    placeholder="Nome do atleta"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRow(idx)}
                    className="text-slate-400 hover:text-red-600 shrink-0"
                    disabled={rows.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="mt-3 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar atleta
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setEditor({ mode: "list" })}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Salvando..." : "Salvar Equipe"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
