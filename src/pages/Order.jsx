import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../lib/supabase'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Order() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const carrito = state?.carrito || []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prAvailable, setPrAvailable] = useState(false)

  // DOM div where Stripe mounts the Apple Pay / Google Pay button
  const prDivRef = useRef(null)
  // Stripe Elements button instance — kept in ref to destroy on unmount
  const prBtnElRef = useRef(null)

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)

  // ── Effect 1: detect Apple Pay / Google Pay and wire up the payment handler ──
  useEffect(() => {
    if (!carrito.length) return
    let cancelled = false

    async function init() {
      const stripe = await stripePromise
      if (!stripe || cancelled) return

      const pr = stripe.paymentRequest({
        country: 'ES',
        currency: 'eur',
        total: { label: 'Tu pedido', amount: Math.round(total * 100) },
        requestPayerName: false,
        requestPayerEmail: false,
      })

      const result = await pr.canMakePayment()
      if (!result || cancelled) return

      const elements = stripe.elements()
      const btn = elements.create('paymentRequestButton', {
        paymentRequest: pr,
        style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '54px' } },
      })
      prBtnElRef.current = btn

      pr.on('paymentmethod', async (ev) => {
        setLoading(true)
        setError('')

        // 1. Guardar el pedido en Supabase
        const { data: pedido, error: dbErr } = await supabase
          .from('pedidos')
          .insert({ restaurante_id: restaurantId, mesa: tableId, items: carrito, total, estado: 'pendiente_pago' })
          .select('id')
          .single()

        if (dbErr || !pedido) {
          ev.complete('fail')
          setError('Error al guardar el pedido.')
          setLoading(false)
          return
        }

        // 2. Crear PaymentIntent en el servidor
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, pedidoId: pedido.id }),
        })
        const { clientSecret, error: piErr } = await res.json()

        if (piErr || !clientSecret) {
          ev.complete('fail')
          setError(piErr || 'Error al iniciar el pago.')
          setLoading(false)
          return
        }

        // 3. Confirmar con el payment method de Apple/Google Pay
        const { paymentIntent, error: confirmErr } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        )

        if (confirmErr) {
          ev.complete('fail')
          setError(confirmErr.message)
          setLoading(false)
          return
        }

        ev.complete('success')

        // Manejar 3DS si fuera necesario (infrecuente en Apple/Google Pay)
        if (paymentIntent.status === 'requires_action') {
          const { error: actionErr } = await stripe.confirmCardPayment(clientSecret)
          if (actionErr) {
            setError(actionErr.message)
            setLoading(false)
            return
          }
        }

        // 4. Marcar como pagado y redirigir
        await supabase.from('pedidos').update({ estado: 'pagado' }).eq('id', pedido.id)
        navigate(`/menu/${restaurantId}/gracias?pedido_id=${pedido.id}`)
      })

      if (!cancelled) setPrAvailable(true)
    }

    init()
    return () => { cancelled = true }
  }, []) // carrito/total/restaurantId/tableId son estables tras el montaje inicial

  // ── Effect 2: montar el botón una vez que su div está en el DOM ──
  useEffect(() => {
    if (!prAvailable || !prDivRef.current || !prBtnElRef.current) return
    prBtnElRef.current.mount(prDivRef.current)
    return () => prBtnElRef.current?.destroy()
  }, [prAvailable])

  // ── Flujo original: Stripe Checkout Session (tarjeta / Bizum / etc.) ──
  async function confirmarPedido() {
    setLoading(true)
    setError('')

    const { data: pedido, error: dbError } = await supabase
      .from('pedidos')
      .insert({ restaurante_id: restaurantId, mesa: tableId, items: carrito, total, estado: 'pendiente_pago' })
      .select('id')
      .single()

    if (dbError || !pedido) {
      setError('Error al guardar el pedido. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: carrito, pedidoId: pedido.id, restaurantId, tableId }),
    })
    const json = await res.json()
    const { url, error: stripeError } = json

    if (stripeError || !url) {
      setError(stripeError || 'No se recibió URL de pago. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const stripe = await stripePromise
    if (!stripe) {
      setError('No se pudo cargar el sistema de pago. Recarga la página.')
      setLoading(false)
      return
    }
    window.location.href = url
  }

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '56px 24px 24px', borderBottom: '1px solid #f2f2f7' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#111', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontFamily: 'inherit' }}>← Volver</button>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>Mesa {tableId}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1 }}>Tu pedido</div>
      </div>

      <div style={{ padding: '8px 24px 0' }}>
        {carrito.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f2f2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: '#111', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{p.cantidad}</span>
              <span style={{ fontSize: 15, color: '#111', fontWeight: 500 }}>{p.nombre}</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flexShrink: 0 }}>{(p.precio * p.cantidad).toFixed(2)}€</span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 32px' }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#111' }}>Total</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>{total.toFixed(2)}€</span>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Apple Pay / Google Pay — solo aparece si el dispositivo lo soporta */}
        {prAvailable && (
          <div style={{ marginBottom: 16 }}>
            <div ref={prDivRef} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#f2f2f7' }} />
              <span style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>o paga con tarjeta</span>
              <div style={{ flex: 1, height: 1, background: '#f2f2f7' }} />
            </div>
          </div>
        )}

        <button
          onClick={confirmarPedido}
          disabled={loading}
          style={{ width: '100%', padding: '16px 20px', background: loading ? '#6e6e73' : '#111', color: '#fff', border: 'none', borderRadius: 16, cursor: loading ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, letterSpacing: 0.2, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', transition: 'background 0.2s' }}
        >
          {loading ? 'Conectando con el pago...' : 'Pagar pedido'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#aeaeb2' }}>
          Pago seguro con Stripe · Apple Pay · Google Pay · Tarjeta
        </div>
      </div>
    </div>
  )
}
