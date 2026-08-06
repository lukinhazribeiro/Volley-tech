import { HubShell } from "@/components/volley-hub/hub-shell"
import { HubDashboard } from "@/components/volley-hub/hub-dashboard"

// Página inicial = Volley Hub. É o cérebro do sistema que abre logo após o
// login (o AuthGate no layout raiz garante a sessão e a assinatura). O Volley
// Hub NÃO é um módulo: é a central de onde se acessa todos os módulos.
export default function HomePage() {
  return (
    <HubShell>
      <HubDashboard />
    </HubShell>
  )
}
