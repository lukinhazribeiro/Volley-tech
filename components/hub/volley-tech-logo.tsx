export function VolleyTechLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Volley Tech"
    >
      {/* chevron superior (mais largo, semi-transparente) */}
      <path
        d="M40 50 L72 50 L100 84 L128 50 L160 50 L100 122 Z"
        fill="currentColor"
        opacity="0.5"
      />
      {/* chevron inferior (sólido) */}
      <path
        d="M52 88 L80 88 L100 112 L120 88 L148 88 L100 156 Z"
        fill="currentColor"
      />
    </svg>
  )
}
