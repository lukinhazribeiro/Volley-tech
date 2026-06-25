import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/subscription"
import { isMercadoPagoTestMode } from "@/lib/mercado-pago"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const metadata = {
  title: "Painel Administrativo — Volleyball Scout Pro",
  description: "Gestão de assinantes, trials e pagamentos.",
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }
  if (!isAdminEmail(user.email)) {
    redirect("/")
  }

  return <AdminDashboard adminEmail={user.email ?? ""} testMode={isMercadoPagoTestMode()} />
}
