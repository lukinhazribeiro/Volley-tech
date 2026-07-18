import { cn } from "@/lib/utils"

/**
 * Logo oficial da Volley Tech (imagem com fundo transparente).
 * O `className` continua controlando o tamanho (ex.: h-10 w-10). Classes de cor
 * de texto são ignoradas de propósito, pois a logo já tem suas próprias cores.
 */
export function VolleyTechLogo({ className }: { className?: string }) {
  return (
    <img
      src="/volley-tech-logo.png"
      alt="Volley Tech"
      className={cn("object-contain", className)}
      draggable={false}
    />
  )
}
