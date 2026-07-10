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
  { label: "Dashboard", href: "/gestao", icon: LayoutGrid },
  { label: "Atletas", href: "/gestao/atletas", icon: Users },
  { label: "Turmas", href: "/gestao/turmas", icon: Users2 },
  { label: "Categorias", href: "/gestao/categorias", icon: Layers },
  { label: "Check-in", href: "/gestao/check-in", icon: ClipboardCheck, hint: "Lista de chamada" },
  { label: "Frequência", href: "/gestao/frequencia", icon: Clock },
  { label: "Financeiro", href: "/gestao/financeiro", icon: Wallet },
  { label: "Pagamentos", href: "/gestao/pagamentos", icon: CreditCard },
  { label: "Relatórios", href: "/gestao/relatorios", icon: FileText },
  { label: "Comunicações", href: "/gestao/comunicacoes", icon: MessageSquare, badge: "Novo" },
  { label: "Configurações", href: "/gestao/configuracoes", icon: Settings },
]
