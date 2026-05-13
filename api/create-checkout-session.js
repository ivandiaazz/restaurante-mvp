import Stripe from 'stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { items, pedidoId, restaurantId, tableId } = req.body

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      automatic_payment_methods: { enabled: true },
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

    return res.status(200).json({ url: session.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
