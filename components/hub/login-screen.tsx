"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Mail, Lock, Gift, ArrowUpRight, Check, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VolleyTechLogo } from "@/components/hub/volley-tech-logo"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, TRIAL_DAYS } from "@/lib/subscription"

type Mode = "signin" | "signup" | "recover"
/**
 * Etapas da recuperação com aprovação do administrador:
 *   request  → o cliente pede a liberação;
 *   waiting  → pedido registrado, aguardando o ADM autorizar;
 *   confirm  → autorizado, o cliente define a nova senha.
 */
type RecoverStep = "request" | "waiting" | "confirm"

/** Identifica o pedido no navegador de quem pediu. */
interface PendingReset {
  requestId: string
  token: string
}

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [recoverStep, setRecoverStep] = useState<RecoverStep>("request")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState<PendingReset | null>(null)
  const [checking, setChecking] = useState(false)
  /** Evita avisar "aprovado!" mais de uma vez durante a checagem automática. */
  const notifiedRef = useRef(false)

  /** Volta a tela ao estado limpo ao alternar entre entrar/criar/recuperar. */
  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword("")
    setConfirmPassword("")
    setNote("")
    setPending(null)
    setRecoverStep("request")
    notifiedRef.current = false
  }

  /** Consulta a situação do pedido; libera a nova senha quando aprovado. */
  const checkApproval = useCallback(
    async (target: PendingReset, manual: boolean) => {
      setChecking(true)
      try {
        const res = await fetch("/api/auth/reset-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) return

        if (payload.status === "authorized") {
          setRecoverStep("confirm")
          if (!notifiedRef.current) {
            notifiedRef.current = true
            setError(null)
            setInfo("Pedido aprovado! Defina sua nova senha abaixo.")
          }
        } else if (payload.status === "denied") {
          setInfo(null)
          setError("Seu pedido foi recusado pelo administrador.")
        } else if (manual) {
          setInfo("Seu pedido ainda está aguardando aprovação do administrador.")
        }
      } catch {
        // Falha de rede na checagem automática é silenciosa: a próxima tentativa resolve.
      } finally {
        setChecking(false)
      }
    },
    [],
  )

  // Enquanto espera, verifica a aprovação a cada 10s para o cliente não
  // precisar recarregar a página.
  useEffect(() => {
    if (recoverStep !== "waiting" || !pending) return
    const id = setInterval(() => void checkApproval(pending, false), 10_000)
    return () => clearInterval(id)
  }, [recoverStep, pending, checkApproval])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === "signup" || (mode === "recover" && recoverStep === "confirm")) {
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.")
        return
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.")
        return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()

      if (mode === "recover") {
        // Etapa 1: registra o pedido para o administrador autorizar.
        if (recoverStep === "request") {
          const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, message: note }),
          })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(payload?.error ?? "Não foi possível registrar o pedido.")

          if (payload.pending) {
            setPending({ requestId: payload.requestId, token: payload.token })
          }
          setRecoverStep("waiting")
          setInfo(
            "Pedido enviado ao administrador. Assim que ele autorizar, você poderá criar a nova senha nesta mesma tela.",
          )
          setLoading(false)
          return
        }

        // Etapa 2: pedido aprovado, grava a nova senha.
        if (!pending) throw new Error("Pedido inválido. Faça um novo pedido.")
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pending, password }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload?.error ?? "Não foi possível redefinir a senha.")

        // Entra direto com a senha nova; o AuthGate cuida do redirecionamento.
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          switchMode("signin")
          setInfo("Senha redefinida. Faça login com a nova senha.")
          setLoading(false)
        }
        return
      }

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

          {/* Chamada inferior */}
          <div className="absolute inset-x-0 bottom-0 p-10">
            {/* Selo de trial */}
            <div className="mb-6 inline-flex flex-col rounded-2xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Gift className="h-6 w-6 text-orange-500" aria-hidden="true" />
                <span className="text-lg font-extrabold uppercase tracking-wide text-orange-500">
                  {TRIAL_DAYS} dias grátis
                </span>
              </div>
              <span className="mt-2 block h-0.5 w-12 bg-orange-500" />
              <p className="mt-3 text-sm text-neutral-300">
                Depois apenas <span className="font-bold text-white">{formatPrice()}/mês</span>.
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">Cancele quando quiser.</p>
            </div>

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
              {mode === "signin" && (
                <>
                  Bem-vindo ao <span className="text-orange-500">VolleyTech</span>
                </>
              )}
              {mode === "signup" && (
                <>
                  Crie sua <span className="text-orange-500">conta grátis</span>
                </>
              )}
              {mode === "recover" && (
                <>
                  Recuperar <span className="text-orange-500">senha</span>
                </>
              )}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400 text-pretty">
              {mode === "signin" && "Entre para acessar sua análise de desempenho no voleibol."}
              {mode === "signup" && `Comece agora com ${TRIAL_DAYS} dias grátis. Sem cartão para testar.`}
              {mode === "recover" &&
                (recoverStep === "request"
                  ? "Informe seu email para solicitar a liberação da troca de senha ao administrador."
                  : recoverStep === "waiting"
                    ? "Seu pedido foi enviado. Aguarde a autorização do administrador."
                    : "Pedido autorizado. Escolha sua nova senha.")}
            </p>

            {mode === "signup" && (
              <ul className="mt-6 space-y-2.5 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                {[
                  `${TRIAL_DAYS} dias de teste gratuito`,
                  "Scout por vídeo e relatórios completos",
                  "Gestão de atletas, turmas e financeiro",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5 text-sm text-neutral-200">
                    <Check className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6" />

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
                    disabled={mode === "recover" && recoverStep !== "request"}
                    className="h-12 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                    placeholder="voce@email.com"
                  />
                </div>
              </div>

              {/* Recado opcional para o administrador identificar quem pediu */}
              {mode === "recover" && recoverStep === "request" && (
                <div className="space-y-1.5">
                  <label htmlFor="note" className="text-sm font-semibold text-neutral-200">
                    Mensagem para o administrador{" "}
                    <span className="font-normal text-neutral-500">(opcional)</span>
                  </label>
                  <textarea
                    id="note"
                    rows={3}
                    maxLength={300}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full resize-none rounded-xl border border-white/10 bg-neutral-950/60 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Ex.: Sou a Ana, treinadora da equipe sub-15."
                  />
                  <p className="text-xs text-neutral-500">
                    Ajuda o administrador a confirmar que o pedido é realmente seu.
                  </p>
                </div>
              )}

              {/* Espera pela autorização do administrador */}
              {mode === "recover" && recoverStep === "waiting" && (
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
                    <span className="text-sm font-bold text-orange-500">
                      Aguardando autorização
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-neutral-300">
                    Avise o administrador que seu pedido está no painel. Deixe esta tela aberta:
                    ela libera a criação da nova senha automaticamente após a aprovação.
                  </p>
                  {pending && (
                    <button
                      type="button"
                      onClick={() => void checkApproval(pending, true)}
                      disabled={checking}
                      className="mt-3 text-xs font-semibold text-orange-500 hover:underline disabled:opacity-60"
                    >
                      {checking ? "Verificando..." : "Já fui aprovado — verificar agora"}
                    </button>
                  )}
                </div>
              )}

              {/* Confirmação da autorização, antes dos campos de senha */}
              {mode === "recover" && recoverStep === "confirm" && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <p className="text-sm text-neutral-300">
                    Autorizado pelo administrador. Crie sua nova senha abaixo.
                  </p>
                </div>
              )}

              {(mode !== "recover" || recoverStep === "confirm") && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-neutral-200">
                  {mode === "recover" ? "Nova senha" : "Senha"}
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
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("recover")}
                    className="text-xs font-semibold text-orange-500 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              )}

              {(mode === "signup" || (mode === "recover" && recoverStep === "confirm")) && (
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-neutral-200">
                    {mode === "recover" ? "Confirmar nova senha" : "Confirmar senha"}
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                      aria-hidden="true"
                    />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
              )}

              {/* Na espera não há nada a enviar: a aprovação é do administrador. */}
              {!(mode === "recover" && recoverStep === "waiting") && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-base font-bold text-white transition hover:bg-orange-500 disabled:opacity-60"
                >
                  {loading
                    ? "Aguarde..."
                    : mode === "signin"
                      ? "Entrar"
                      : mode === "signup"
                        ? "Criar conta e iniciar trial"
                        : recoverStep === "request"
                          ? "Solicitar liberação"
                          : "Redefinir senha e entrar"}
                  {!loading && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                </Button>
              )}
            </form>

            <p className="mt-5 text-center text-sm text-neutral-300">
              {mode === "recover" ? (
                <>
                  Lembrou a senha?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-semibold text-orange-500 hover:underline"
                  >
                    Voltar para o login
                  </button>
                </>
              ) : (
                <>
                  {mode === "signin" ? "Não possui conta?" : "Já tem uma conta?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                    className="font-semibold text-orange-500 hover:underline"
                  >
                    {mode === "signin" ? "Criar conta" : "Entrar"}
                  </button>
                </>
              )}
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
