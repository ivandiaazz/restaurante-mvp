import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Validar env vars antes de hacer nada ──────────────────────────────────
  const {
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('[send-push] FALTAN VAPID KEYS — PUBLIC:', !!VAPID_PUBLIC_KEY, 'PRIVATE:', !!VAPID_PRIVATE_KEY)
    return res.status(500).json({ error: 'VAPID keys not configured on server' })
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[send-push] FALTA SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
  }
  if (!VITE_SUPABASE_URL) {
    console.error('[send-push] FALTA VITE_SUPABASE_URL')
    return res.status(500).json({ error: 'VITE_SUPABASE_URL not configured' })
  }

  try {
    // setVapidDetails DENTRO del handler — nunca falla al cargar el módulo
    webpush.setVapidDetails('mailto:ivanazez06@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { restauranteId, mesa, items, total } = body ?? {}

    console.log('[send-push] request recibido:', {
      restauranteId,
      mesa,
      itemsCount: items?.length ?? 0,
      total,
    })

    if (!restauranteId || !mesa || !items?.length) {
      console.error('[send-push] campos faltantes:', {
        restauranteId: !!restauranteId,
        mesa: !!mesa,
        items: items?.length ?? 0,
      })
      return res.status(400).json({ error: 'Faltan campos: restauranteId, mesa o items' })
    }

    // ── Leer suscripciones ─────────────────────────────────────────────────
    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('subscription, endpoint')
      .eq('restaurante_id', restauranteId)

    if (subsErr) {
      console.error('[send-push] error leyendo push_subscriptions:', subsErr.code, subsErr.message)
      return res.status(500).json({ error: 'Error Supabase: ' + subsErr.message })
    }

    console.log(`[send-push] suscripciones encontradas: ${subs?.length ?? 0} para restaurante "${restauranteId}"`)

    if (!subs?.length) {
      return res.status(200).json({ sent: 0, reason: 'No hay suscripciones registradas para este restaurante' })
    }

    // ── Enviar notificaciones ──────────────────────────────────────────────
    const itemsText = items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ')
    const payload = JSON.stringify({
      title: `🍽️ Nuevo pedido — Mesa ${mesa}`,
      body: `${itemsText} · ${Number(total).toFixed(2)}€`,
      url: `/admin/${restauranteId}`,
    })

    const results = await Promise.allSettled(
      subs.map(({ subscription }) => {
        // Supabase devuelve JSONB como objeto, pero por si acaso viene como string
        const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription
        if (!sub?.endpoint || !sub?.keys?.auth || !sub?.keys?.p256dh) {
          console.error('[send-push] suscripción malformada — faltan campos:', JSON.stringify(sub).slice(0, 100))
          return Promise.reject(new Error('Subscription malformada'))
        }
        return webpush.sendNotification(sub, payload)
      })
    )

    // Log detallado de cada resultado
    results.forEach((r, i) => {
      const ep = subs[i]?.endpoint?.slice(0, 70) ?? 'unknown'
      if (r.status === 'fulfilled') {
        console.log(`[send-push] OK sub[${i}] statusCode=${r.value?.statusCode} endpoint=…${ep.slice(-30)}`)
      } else {
        console.error(`[send-push] FAIL sub[${i}] endpoint=…${ep.slice(-30)} error:`, r.reason?.message ?? r.reason)
      }
    })

    const sent = results.filter(r => r.status === 'fulfilled').length
    console.log(`[send-push] RESUMEN: sent=${sent}/${subs.length} para "${restauranteId}"`)
    return res.status(200).json({ sent, total: subs.length })

  } catch (err) {
    console.error('[send-push] error no controlado:', err.message, err.stack?.split('\n')[1])
    return res.status(500).json({ error: err.message })
  }
}
