/**
 * Volley Hub — catálogo dos módulos Volley Tech.
 *
 * O Hub apenas APONTA para os módulos existentes (não os altera). Usado tanto
 * pela barra lateral quanto pelos cards "Módulos Volley Tech" do dashboard.
 */

export interface VolleyModule {
  key: string
  title: string
  tag: string
  description: string
  href: string
  image: string
  /** Cor de destaque do módulo (usada no badge/índice). */
  accent: string
  features: string[]
}

export const VOLLEY_MODULES: VolleyModule[] = [
  {
    key: "scout-volleyball",
    title: "Scout Volleyball",
    tag: "Análise de desempenho",
    description: "Registro e análise de scout das partidas e fundamentos do time em tempo real.",
    href: "/scout-volleyball",
    image: "/images/hub-scout-volleyball.jpg",
    accent: "#38bdf8",
    features: ["Tempo real", "Por fundamento", "Sincronização"],
  },
  {
    key: "attack-position",
    title: "Attack Position",
    tag: "Inteligência tática",
    description: "Mapeamento de posições e zonas de ataque na quadra com coletor por fases.",
    href: "/attack-position",
    image: "/images/hub-attack-position.jpg",
    accent: "#f97316",
    features: ["Quadra interativa", "Coletor por fases", "Exportar PDF"],
  },
  {
    key: "summary-game",
    title: "Summary Game",
    tag: "Súmula digital",
    description: "Resumo e estatísticas consolidadas de cada jogo em uma súmula profissional.",
    href: "/summary-game",
    image: "/images/hub-summary-game.jpg",
    accent: "#34d399",
    features: ["Súmula digital", "Estatísticas", "Relatório"],
  },
  {
    key: "scout-video",
    title: "Scout View IA",
    tag: "Análise por vídeo",
    description: "Painel de análise com vídeo e leitura por IA para gerar o scout direto das imagens da partida.",
    href: "/scout-video",
    image: "/images/hub-scout-video.jpg",
    accent: "#a78bfa",
    features: ["Vídeo + IA", "Por posição", "Relatório"],
  },
  {
    key: "gestao",
    title: "Gestão de Clube",
    tag: "Gestão e organização",
    description: "Gerencie atletas, turmas, presenças, financeiro e documentos do seu clube.",
    href: "/gestao",
    image: "/images/hub-gestao-clube.svg",
    accent: "#fbbf24",
    features: ["Atletas", "Turmas", "Financeiro"],
  },
]
