import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { pedidoId, totalPorPersona, numeroPersona, totalPersonas, restaurantId, tableId } = body ?? {}

    if (!pedidoId || !totalPorPersona || !numeroPersona || !totalPersonas || !restaurantId || !tableId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const appUrl = process.env.VITE_APP_URL ?? 'https://restaurante-mvp-blue.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Cuenta · parte ${numeroPersona} de ${totalPersonas}` },
          unit_amount: Math.round(totalPorPersona * 100),
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/menu/${restaurantId}/gracias?pedido_id=${pedidoId}&split=1&persona=${numeroPersona}&total_personas=${totalPersonas}`,
      cancel_url: `${appUrl}/order/${restaurantId}/${tableId}`,
      metadata: { pedidoId, numeroPersona: String(numeroPersona), totalPersonas: String(totalPersonas) },
    })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { error: dbErr } = await supabase.from('pagos_divididos').insert({
      pedido_id: pedidoId,
      numero_persona: numeroPersona,
      total_personas: totalPersonas,
      importe: totalPorPersona,
      estado: 'pendiente',
      stripe_session_id: session.id,
    })

    if (dbErr) console.error('[split-payment] DB insert error:', dbErr.message)

    console.log('[split-payment] session created:', session.id, `persona ${numeroPersona}/${totalPersonas}`)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[split-payment] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
