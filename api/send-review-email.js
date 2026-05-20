import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Siempre 200 — un fallo aquí no debe romper el flujo de pago
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { pedidoId, restauranteId, emailCliente, mesa } = body ?? {}

    console.log('[send-review-email] request:', { pedidoId, restauranteId, emailCliente: !!emailCliente, mesa })

    if (!pedidoId || !emailCliente || !restauranteId) {
      console.warn('[send-review-email] campos faltantes — omitido')
      return res.status(200).json({ skipped: true, reason: 'missing fields' })
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[send-review-email] RESEND_API_KEY no configurada — omitido')
      return res.status(200).json({ skipped: true, reason: 'no RESEND_API_KEY' })
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('nombre')
      .eq('slug', restauranteId)
      .single()

    const nombreRestaurante = restaurant?.nombre ?? restauranteId
    const appUrl = process.env.VITE_APP_URL ?? 'https://restaurante-mvp-blue.vercel.app'
    const reviewUrl = `${appUrl}/valorar/${pedidoId}`

    // Programar 2 horas en el futuro
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

    const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:32px 16px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">

  <!-- Cabecera -->
  <tr><td style="background:#111;border-radius:16px 16px 0 0;padding:40px 32px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">&#11088;</div>
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">&#191;Qu&#233; tal tu experiencia?</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:8px;">${nombreRestaurante} &middot; Mesa ${mesa ?? ''}</div>
  </td></tr>

  <!-- Cuerpo -->
  <tr><td style="background:#fff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
    <p style="margin:0 0 24px;font-size:15px;color:#6e6e73;line-height:1.6;">
      Esperamos que hayas disfrutado de tu visita. Tu opini&#243;n nos ayuda a seguir mejorando.
      Solo te llevar&#225; un momento.
    </p>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${reviewUrl}"
           style="display:inline-block;background:#111;color:#fff;text-decoration:none;
                  font-size:15px;font-weight:600;padding:16px 36px;border-radius:12px;
                  letter-spacing:0.2px;">
          Valorar mi experiencia
        </a>
      </td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#aeaeb2;text-align:center;line-height:1.6;">
      Si el bot&#243;n no funciona, copia este enlace en tu navegador:<br />
      <a href="${reviewUrl}" style="color:#aeaeb2;">${reviewUrl}</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Pedidos <onboarding@resend.dev>',
        to: [emailCliente],
        subject: `¿Qué te pareció ${nombreRestaurante}? Cuéntanos`,
        html,
        scheduled_at: scheduledAt,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[send-review-email] Resend error:', JSON.stringify(data))
      return res.status(200).json({ ok: false, resend_error: data })
    }

    console.log('[send-review-email] programado para', scheduledAt, 'id:', data.id, 'restaurante:', restauranteId)
    return res.status(200).json({ ok: true, scheduledAt, emailId: data.id })

  } catch (err) {
    console.error('[send-review-email] error no controlado:', err.message)
    return res.status(200).json({ ok: false, error: err.message })
  }
}
