"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, Gift, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, TRIAL_DAYS } from "@/lib/subscription"

type Mode = "signin" | "signup"

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Painel visual */}
        <section className="relative hidden overflow-hidden bg-neutral-950 lg:block">
          <img
            src="/images/hub-highlight.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />

          {/* Logo */}
          <div className="absolute left-10 top-10 flex items-center gap-3">
            <VolleyTechLogo className="h-16 w-16 text-orange-500" />
            <span className="text-3xl font-extrabold tracking-tight">
              VOLLEY<span className="text-orange-500">TECH</span>
            </span>
          </div>

          {/* Selo de trial */}
          <div className="absolute right-10 top-12 w-52 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
            <Gift className="h-8 w-8 text-orange-500" aria-hidden="true" />
            <p className="mt-3 text-lg font-extrabold uppercase tracking-wide text-orange-500">
              {TRIAL_DAYS} dias grátis
            </p>
            <span className="mt-2 block h-0.5 w-12 bg-orange-500" />
            <p className="mt-4 text-sm text-neutral-300">
              Depois apenas
              <br />
              <span className="text-base font-bold text-white">{formatPrice()}/mês</span>.
            </p>
            <p className="mt-1 text-xs text-neutral-400">Cancele quando quiser.</p>
          </div>

          {/* Chamada inferior */}
          <div className="absolute inset-x-0 bottom-0 p-10">
            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight">
              DADOS QUE
              <br />
              <span className="text-orange-500">TRANSFORMAM</span>
              <br />
              DESEMPENHO.
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-300 text-pretty">
              Análise inteligente para equipes que querem vencer.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <VolleyTechLogo className="h-8 w-8 text-orange-500" />
              <span className="h-px w-44 bg-gradient-to-r from-orange-500 to-transparent" />
            </div>
          </div>
        </section>

        {/* Painel do formulário */}
        <section className="flex w-full items-center justify-center px-5 py-10 sm:px-8">
          {/* Logo (apenas mobile) */}
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <VolleyTechLogo className="h-12 w-12 text-orange-500" />
              <span className="text-xl font-extrabold tracking-tight">
                VOLLEY<span className="text-orange-500">TECH</span>
              </span>
            </div>

            <div className="w-full rounded-3xl border border-white/10 bg-neutral-900/60 p-7 shadow-2xl sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bem-vindo ao <span className="text-orange-500">VolleyTech</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400 text-pretty">
              A plataforma inteligente para análise de desempenho no voleibol.
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-neutral-900 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
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
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
                />
              </svg>
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-neutral-500">ou</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p
                className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-400"
                role="status"
              >
                {info}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-neutral-200">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    placeholder="voce@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-neutral-200">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Mínimo de 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition hover:text-neutral-300"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-base font-bold text-white transition hover:bg-orange-500 disabled:opacity-60"
              >
                {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta e iniciar trial"}
                {!loading && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-neutral-300">
              {mode === "signin" ? "Não possui conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin")
                  setError(null)
                  setInfo(null)
                }}
                className="font-semibold text-orange-500 hover:underline"
              >
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>

            <p className="mt-6 text-center text-xs leading-relaxed text-neutral-500">
              Ao continuar você concorda com nossos{" "}
              <span className="font-semibold text-orange-500">Termos</span> e{" "}
              <span className="font-semibold text-orange-500">Política de Privacidade</span>.
            </p>
            </div>
          </div>
        </section>
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
