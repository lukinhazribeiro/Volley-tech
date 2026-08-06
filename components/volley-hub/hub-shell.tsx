import { HubSidebar } from "./hub-sidebar"

/**
 * Casca visual do Volley Hub: barra lateral em cortina + área de conteúdo.
 * Usada tanto na página inicial (o "cérebro" que abre após o login) quanto
 * nas subpáginas do Hub, para manter uma navegação única e consistente.
 */
export function HubShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hub-theme min-h-screen bg-[var(--hub-bg)] text-[var(--hub-text)]">
      <HubSidebar />
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
