import { AppShell } from "@/components/gestao/app-shell"
import { MessageSquare, Send, Bell, Users } from "lucide-react"

export const dynamic = "force-dynamic"

const recursos = [
  { icon: Send, titulo: "Avisos para pais e atletas", desc: "Envie comunicados por turma, categoria ou para todo o clube." },
  { icon: Bell, titulo: "Lembretes de mensalidade", desc: "Notificações automáticas de vencimento e inadimplência." },
  { icon: Users, titulo: "Grupos por turma", desc: "Canais de comunicação organizados por turma e responsável." },
]

export default function ComunicacoesPage() {
  return (
    <AppShell title="Comunicações" subtitle="Central de mensagens do clube">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MessageSquare className="h-8 w-8" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Módulo em preparação</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            A estrutura de comunicação já faz parte da Gestão de Clube e será ativada em breve, sem
            necessidade de reestruturar a plataforma.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {recursos.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.titulo} className="rounded-2xl border border-border bg-card p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{r.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
