import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:ivanazez06@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Service role key bypasses RLS — subscriptions table is server-read-only
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { restauranteId, mesa, items, total } = body ?? {}

    if (!restauranteId || !mesa || !items?.length) {
      return res.status(400).json({ error: 'Faltan campos' })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('restaurante_id', restauranteId)

    if (!subs?.length) return res.status(200).json({ sent: 0 })

    const itemsText = items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ')
    const payload = JSON.stringify({
      title: `🍽️ Nuevo pedido — Mesa ${mesa}`,
      body: `${itemsText} · ${Number(total).toFixed(2)}€`,
      url: `/admin/${restauranteId}`,
    })

    const results = await Promise.allSettled(
      subs.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    console.log(`[send-push] sent=${sent}/${subs.length} for ${restauranteId}`)
    return res.status(200).json({ sent })
  } catch (err) {
    console.error('[send-push] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
