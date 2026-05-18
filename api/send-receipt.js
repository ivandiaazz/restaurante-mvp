import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Siempre devolvemos 200 — un email fallido no debe romper el flujo de pago
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email, restaurantId, mesa, items, total } = body ?? {}

    if (!email || !restaurantId || !items?.length) {
      return res.status(200).json({ skipped: true })
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[send-receipt] RESEND_API_KEY no configurada — email omitido')
      return res.status(200).json({ skipped: true })
    }

    // Nombre del restaurante (la tabla restaurants es de lectura pública)
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('nombre')
      .eq('slug', restaurantId)
      .single()

    const restaurantName = restaurant?.nombre ?? restaurantId

    const itemsRows = items.map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f2f2f7;font-size:15px;color:#111;">${item.nombre}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f2f2f7;font-size:14px;color:#6e6e73;text-align:center;white-space:nowrap;">${item.cantidad}&times;</td>
        <td style="padding:10px 0;border-bottom:1px solid #f2f2f7;font-size:15px;font-weight:600;color:#111;text-align:right;white-space:nowrap;">${(item.precio * item.cantidad).toFixed(2)}&euro;</td>
      </tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:32px 16px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">

  <!-- Cabecera -->
  <tr><td style="background:#111;border-radius:16px 16px 0 0;padding:36px 32px;text-align:center;">
    <div style="font-size:36px;color:#fff;margin-bottom:12px;">&#10003;</div>
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">&#161;Pago confirmado!</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:6px;">${restaurantName}</div>
  </td></tr>

  <!-- Cuerpo -->
  <tr><td style="background:#fff;border-radius:0 0 16px 16px;padding:28px 32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#aeaeb2;font-weight:600;margin-bottom:18px;">Mesa ${mesa}</div>

    <!-- Líneas del pedido -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsRows}
    </table>

    <!-- Total -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
      <tr>
        <td style="font-size:16px;font-weight:600;color:#111;padding:4px 0;">Total pagado</td>
        <td style="font-size:20px;font-weight:700;color:#111;text-align:right;padding:4px 0;">${Number(total).toFixed(2)}&euro;</td>
      </tr>
    </table>

    <!-- Mensaje -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="background:#f5f5f7;border-radius:12px;padding:16px 20px;font-size:14px;color:#6e6e73;line-height:1.6;">
        &#161;Gracias por tu pedido! En breve te lo llevamos a la mesa.
      </td></tr>
    </table>

    <div style="margin-top:24px;text-align:center;font-size:11px;color:#aeaeb2;">
      Pago procesado de forma segura con Stripe
    </div>
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
        to: [email],
        subject: `Tu pedido en ${restaurantName} · Mesa ${mesa}`,
        html,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[send-receipt] Resend error:', errText)
      return res.status(200).json({ ok: false, resend_error: errText })
    }

    console.log('[send-receipt] email enviado a', email)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-receipt] error:', err)
    return res.status(200).json({ ok: false, error: err.message })
  }
}
