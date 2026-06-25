"use client"

import { useCallback, useEffect, useState } from "react"
import { LoginScreen } from "@/components/hub/login-screen"
import { PaywallScreen } from "@/components/hub/paywall-screen"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { setStoredUser, clearStoredUser, type AuthUser } from "@/lib/auth"
import {
  resolveAccess,
  resolveAccessFromCreatedAt,
  isFreeAccessEmail,
  type AccessState,
  type Subscription,
} from "@/lib/subscription"
import type { User } from "@supabase/supabase-js"

type GateState = "loading" | "login" | "paywall" | "app" | "unconfigured"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading")
  const [access, setAccess] = useState<AccessState | null>(null)
  const [email, setEmail] = useState("")

  const evaluate = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      clearStoredUser()
      setState("login")
      return
    }

    const supabase = createClient()
    const userEmail = authUser.email ?? ""
    setEmail(userEmail)

    // Sincroniza a sessão com o localStorage para o restante do app (Scout/Attack)
    const appUser: AuthUser = {
      id: authUser.id,
      email: userEmail,
      name: (authUser.user_metadata?.full_name as string) || (authUser.user_metadata?.name as string) || userEmail.split("@")[0],
    }
    setStoredUser(appUser)

    // E-mails isentos têm acesso vitalício gratuito, sem consultar assinatura.
    if (isFreeAccessEmail(userEmail)) {
      setAccess({ hasAccess: true, isTrial: false, trialDaysLeft: 0, status: "active" })
      setState("app")
      return
    }

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle<Subscription>()

    // Se a tabela ainda não existe (migração não aplicada), usa o trial
    // derivado da data de criação da conta para não bloquear o acesso.
    const tableMissing =
      error && (error.code === "42P01" || /relation .*subscriptions.* does not exist/i.test(error.message))

    const result =
      tableMissing || (!sub && error)
        ? resolveAccessFromCreatedAt(authUser.created_at)
        : resolveAccess(sub ?? null)

    setAccess(result)
    setState(result.hasAccess ? "app" : "paywall")
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState("unconfigured")
      return
    }

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      evaluate(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [evaluate])

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearStoredUser()
    setState("login")
  }, [])

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" aria-label="Carregando" />
      </div>
    )
  }

  if (state === "login") {
    return <LoginScreen />
  }

  if (state === "unconfigured") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-orange-50 via-amber-50 to-white px-6 text-center text-slate-900">
        <h1 className="text-xl font-bold">Configuração pendente</h1>
        <p className="max-w-md text-sm text-slate-600">
          As variáveis do Supabase ainda não estão disponíveis neste ambiente. Publique o projeto
          ou aguarde a sincronização das variáveis de ambiente para habilitar o login com Google e a
          assinatura.
        </p>
      </main>
    )
  }

  if (state === "paywall" && access) {
    return <PaywallScreen email={email} access={access} onSignOut={handleSignOut} />
  }

  return <>{children}</>
}
