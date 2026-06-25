import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-orange-50 via-amber-50 to-white px-6 text-center text-slate-900">
      <h1 className="text-2xl font-bold">Não foi possível entrar</h1>
      <p className="max-w-sm text-sm text-slate-600">
        Houve um problema ao concluir o login. Tente novamente.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
      >
        Voltar ao início
      </Link>
    </main>
  )
}
