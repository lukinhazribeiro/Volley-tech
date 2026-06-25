"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/summary/ui/button"
import { Card, CardContent } from "@/components/summary/ui/card"
import { Input } from "@/components/summary/ui/input"
import { ArrowLeft, Plus, Trophy, Pencil, Trash2, Save, Users, Check } from "lucide-react"
import {
  getCompetitions,
  saveCompetition,
  updateCompetition,
  deleteCompetition,
  getTeams,
  type Competition,
  type SavedTeam,
} from "@/lib/summary/registry"

export function CompetitionsManager({ onBack }: { onBack: () => void }) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [season, setSeason] = useState("")
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [teams, setTeams] = useState<SavedTeam[]>([])

  const refresh = () => {
    setCompetitions(getCompetitions())
    setTeams(getTeams())
  }
  useEffect(() => {
    refresh()
  }, [])

  const resetForm = () => {
    setName("")
    setCategory("")
    setSeason("")
    setTeamIds([])
    setEditingId(null)
    setShowForm(false)
  }

  const toggleTeam = (id: string) => {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (comp: Competition) => {
    setName(comp.name)
    setCategory(comp.category)
    setSeason(comp.season)
    setTeamIds(comp.teamIds ?? [])
    setEditingId(comp.id)
    setShowForm(true)
  }

  const canSave = name.trim() !== ""

  const handleSave = () => {
    if (!canSave) return
    if (editingId) {
      updateCompetition(editingId, { name, category, season, teamIds })
    } else {
      saveCompetition({ name, category, season, teamIds })
    }
    refresh()
    resetForm()
  }

  const handleDelete = (comp: Competition) => {
    if (!confirm(`Excluir a competição "${comp.name}"?`)) return
    deleteCompetition(comp.id)
    refresh()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <h2 className="text-2xl font-black text-slate-900">Competições</h2>
        </div>
        {!showForm && (
          <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nova Competição
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border border-slate-200">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-slate-900">{editingId ? "Editar Competição" : "Nova Competição"}</h3>
            <div>
              <label className="text-sm font-bold text-slate-600">Nome</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campeonato Estadual"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-600">Categoria</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Sub-13, Adulto"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">Temporada / Ano</label>
                <Input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="Ex: 2026"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-600">Equipes participantes</label>
              <p className="text-xs text-slate-400 mb-2">
                As equipes selecionadas serão as opções disponíveis ao criar uma partida desta competição.
              </p>
              {teams.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  Nenhuma equipe cadastrada. Cadastre equipes na área &quot;Equipes&quot; primeiro.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teams.map((team) => {
                    const selected = teamIds.includes(team.id)
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className={`flex items-center gap-3 rounded-md border-2 px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-200 bg-white hover:border-orange-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                            selected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800 truncate">{team.name}</span>
                          <span className="block text-xs text-slate-500">
                            {team.players.length} {team.players.length === 1 ? "atleta" : "atletas"}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!canSave} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {competitions.length === 0 && !showForm ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma competição cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-1">As competições ajudam a organizar as partidas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {competitions.map((comp) => (
            <Card key={comp.id} className="border border-slate-200 hover:border-orange-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{comp.name}</h3>
                  <p className="text-sm text-slate-500">
                    {[comp.category, comp.season].filter(Boolean).join(" • ") || "Sem categoria/temporada"}
                  </p>
                  <p className="text-xs text-orange-600 font-medium mt-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {(comp.teamIds?.length ?? 0) === 0
                      ? "Nenhuma equipe vinculada"
                      : `${comp.teamIds.length} ${comp.teamIds.length === 1 ? "equipe" : "equipes"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(comp)}
                    title="Editar"
                    className="text-slate-600 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(comp)}
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
    </div>
  )
}
