import { AppShell } from "@/components/gestao/app-shell"
import { listCategorias } from "@/app/gestao/actions/categorias"
import { CategoriasManager } from "@/components/gestao/categorias-manager"

export const dynamic = "force-dynamic"

export default async function CategoriasPage() {
  const categorias = await listCategorias()

  return (
    <AppShell title="Categorias" subtitle={`${categorias.length} categorias`}>
      <div className="mx-auto max-w-3xl">
        <CategoriasManager
          categorias={categorias.map((c) => ({
            id: c.id,
            nome: c.nome,
            descricao: c.descricao,
            ativo: c.ativo,
            totalAtletas: c.totalAtletas,
          }))}
        />
      </div>
    </AppShell>
  )
}
