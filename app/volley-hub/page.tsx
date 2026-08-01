import { redirect } from "next/navigation"

// O dashboard do Volley Hub agora vive na página inicial ("/"). Mantemos esta
// rota apenas por compatibilidade, redirecionando para evitar duplicação.
export default function VolleyHubDashboardPage() {
  redirect("/")
}
