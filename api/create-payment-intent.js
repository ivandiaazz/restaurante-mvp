import Stripe from 'stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { amount, pedidoId } = body ?? {}

    if (!amount || !pedidoId) {
      return res.status(400).json({ error: `Faltan campos: amount=${!!amount} pedidoId=${!!pedidoId}` })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY no está configurada en el servidor' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: { pedidoId },
    })

    return res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[payment-intent] error:', err)
    return res.status(500).json({ error: err.message ?? String(err) })
  }
}
