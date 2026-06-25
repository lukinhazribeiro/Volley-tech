"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, TRIAL_DAYS } from "@/lib/subscription"

type Mode = "signin" | "signup"

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const supabase = createClient()

      if (mode === "signup") {
        // Cria o usuário já confirmado no servidor, permitindo login imediato.
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(payload?.error ?? "Não foi possível criar a conta.")
        }
        // Faz login imediatamente após o cadastro.
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // onAuthStateChange no AuthGate cuida do redirecionamento.
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : "Não foi possível continuar."))
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      // Redirecionamento para o Google acontece automaticamente.
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : "Não foi possível continuar com o Google."))
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-white px-6 text-slate-900">
      <div
        className="pointer-events-none absolute left-1/2 top-[-8rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-orange-300 opacity-30 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <VolleyTechLogo className="mb-4 h-20 w-20 text-orange-600 drop-shadow-[0_0_24px_rgba(234,88,12,0.25)]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">VOLLEY TECH</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "signin" ? "Entre para acessar a plataforma" : "Crie sua conta para começar"}
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-orange-100 bg-white p-6 shadow-2xl">
          <div className="rounded-xl bg-orange-50 p-4 text-center">
            <p className="text-sm font-semibold text-orange-700">{TRIAL_DAYS} dias grátis no primeiro acesso</p>
            <p className="mt-1 text-xs text-slate-600">
              Depois, assinatura mensal de {formatPrice()} cobrada via Mercado Pago.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700" role="status">
              {info}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
              />
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="voce@email.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="Mínimo de 6 caracteres"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700"
            >
              {loading
                ? "Aguarde..."
                : mode === "signin"
                  ? "Entrar"
                  : "Criar conta e iniciar trial"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            {mode === "signin" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin")
                setError(null)
                setInfo(null)
              }}
              className="font-semibold text-orange-600 hover:underline"
            >
              {mode === "signin" ? "Criar conta" : "Entrar"}
            </button>
          </p>

          <p className="text-center text-xs text-slate-500">
            Ao criar a conta, você concorda com a cobrança mensal recorrente após o período gratuito.
          </p>
        </div>
      </div>
    </main>
  )
}

function translateError(message: string) {
  if (message.includes("Invalid login credentials")) return "Email ou senha incorretos."
  if (message.includes("User already registered")) return "Este email já está cadastrado. Faça login."
  if (message.includes("Email not confirmed")) return "Confirme seu email antes de entrar."
  if (message.includes("Password should be")) return "A senha deve ter pelo menos 6 caracteres."
  return message
}
