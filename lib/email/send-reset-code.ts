import "server-only"

import { CODE_TTL_MINUTES } from "@/lib/auth/password-reset"

/**
 * Remetente. Sem domínio verificado, o Resend só entrega para o email da
 * própria conta usando onboarding@resend.dev. Depois de verificar um domínio,
 * basta definir RESEND_FROM_EMAIL (ex.: "Volley Tech <nao-responda@seu.com>").
 */
const DEFAULT_FROM = "Volley Tech <onboarding@resend.dev>"

export type SendResult = { ok: true } | { ok: false; error: string; notConfigured?: boolean }

/** Envia o código de recuperação de senha. */
export async function sendResetCodeEmail(to: string, code: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      notConfigured: true,
      error: "Envio de email não configurado (RESEND_API_KEY ausente).",
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        subject: `${code} é seu código de recuperação — Volley Tech`,
        text: [
          "Recuperação de senha — Volley Tech",
          "",
          `Seu código de verificação é: ${code}`,
          "",
          `O código expira em ${CODE_TTL_MINUTES} minutos e só pode ser usado uma vez.`,
          "Se você não pediu a redefinição, ignore este email: sua senha atual continua valendo.",
        ].join("\n"),
        html: buildHtml(code),
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.log("[v0] Resend falhou:", res.status, detail)
      return { ok: false, error: `Falha no envio do email (${res.status}).` }
    }
    return { ok: true }
  } catch (err) {
    console.log("[v0] Erro de rede ao enviar email:", err)
    return { ok: false, error: "Não foi possível contatar o serviço de email." }
  }
}

function buildHtml(code: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:16px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#f97316;">Volley Tech</p>
          <h1 style="margin:12px 0 0;font-size:21px;line-height:1.3;color:#ffffff;">Recuperação de senha</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#a3a3a3;">
            Use o código abaixo para definir uma nova senha de acesso.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;">
          <div style="padding:18px;background:#0a0a0a;border:1px solid #f97316;border-radius:12px;text-align:center;">
            <span style="font-size:34px;font-weight:700;letter-spacing:9px;color:#ffffff;">${code}</span>
          </div>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#a3a3a3;">
            O código expira em <strong style="color:#ffffff;">${CODE_TTL_MINUTES} minutos</strong> e pode ser usado uma única vez.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;border-top:1px solid #262626;">
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#737373;">
            Não pediu esta redefinição? Ignore este email — sua senha atual continua valendo.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
