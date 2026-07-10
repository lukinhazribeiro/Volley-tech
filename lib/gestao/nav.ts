import {
  LayoutGrid,
  Users,
  Users2,
  Layers,
  ClipboardCheck,
  Clock,
  Wallet,
  CreditCard,
  FileText,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  hint?: string
  badge?: string
}

export const nav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Atletas", href: "/atletas", icon: Users },
  { label: "Turmas", href: "/turmas", icon: Users2 },
  { label: "Categorias", href: "/categorias", icon: Layers },
  { label: "Check-in", href: "/check-in", icon: ClipboardCheck, hint: "Lista de chamada" },
  { label: "Frequência", href: "/frequencia", icon: Clock },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Pagamentos", href: "/pagamentos", icon: CreditCard },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Comunicações", href: "/comunicacoes", icon: MessageSquare, badge: "Novo" },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
]
