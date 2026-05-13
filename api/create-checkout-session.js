import Stripe from 'stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { items, pedidoId, restaurantId, tableId } = body ?? {}

    console.log('[checkout] body received:', JSON.stringify({ pedidoId, restaurantId, tableId, itemsCount: items?.length }))

    if (!items?.length || !pedidoId || !restaurantId || !tableId) {
      return res.status(400).json({ error: `Faltan campos en el body: items=${!!items} pedidoId=${!!pedidoId} restaurantId=${!!restaurantId} tableId=${!!tableId}` })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY no está configurada en el servidor' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // 'card' incluye automáticamente Apple Pay y Google Pay en Stripe Checkout
      // cuando el dispositivo/navegador del cliente los soporta.
      // 'link' activa Stripe Link (pago con un clic para usuarios registrados).
      payment_method_types: ['card', 'link'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.nombre },
          unit_amount: Math.round(item.precio * 100),
        },
        quantity: item.cantidad,
      })),
      success_url: `https://restaurante-mvp-blue.vercel.app/menu/${restaurantId}/gracias?pedido_id=${pedidoId}`,
      cancel_url: `https://restaurante-mvp-blue.vercel.app/order/${restaurantId}/${tableId}`,
      metadata: { pedidoId },
    })

    console.log('[checkout] session created:', session.id)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[checkout] error:', err)
    return res.status(500).json({ error: err.message ?? String(err) })
  }
}
