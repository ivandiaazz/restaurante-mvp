import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

// Inicializar Stripe al cargar el módulo mejora el rendimiento y
// habilita la verificación de dominio para Apple Pay
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function Order() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const carrito = state?.carrito || []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)

  async function confirmarPedido() {
    setLoading(true)
    setError('')

    // 1. Guardar pedido en Supabase con estado pendiente_pago
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

    // 2. Crear sesión de Stripe Checkout
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: carrito, pedidoId: pedido.id, restaurantId, tableId })
    })
    const json = await res.json()
    const { url, error: stripeError } = json
    console.log('[order] checkout response:', { status: res.status, url: !!url, error: stripeError })

    if (stripeError || !url) {
      setError(stripeError || 'No se recibió URL de pago. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    // 3. Redirigir a Stripe Checkout (soporta Apple Pay, Google Pay y tarjeta)
    const stripe = await stripePromise
    if (!stripe) {
      setError('No se pudo cargar el sistema de pago. Recarga la página.')
      setLoading(false)
      return
    }
    window.location.href = url
  }

  const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px', borderBottom: '1px solid #f2f2f7' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, color: '#111', padding: 0, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
            fontFamily: 'inherit'
          }}
        >
          ← Volver
        </button>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>
          Mesa {tableId}
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1 }}>
          Tu pedido
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '8px 24px 0' }}>
        {carrito.map(p => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 0', borderBottom: '1px solid #f2f2f7'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                background: '#111', color: '#fff', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
              }}>{p.cantidad}</span>
              <span style={{ fontSize: 15, color: '#111', fontWeight: 500 }}>{p.nombre}</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flexShrink: 0 }}>
              {(p.precio * p.cantidad).toFixed(2)}€
            </span>
          </div>
        ))}

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 32px'
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#111' }}>Total</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>
            {total.toFixed(2)}€
          </span>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Botón pagar */}
        <button
          onClick={confirmarPedido}
          disabled={loading}
          style={{
            width: '100%', padding: '16px 20px',
            background: loading ? '#6e6e73' : '#111',
            color: '#fff', border: 'none', borderRadius: 16,
            cursor: loading ? 'default' : 'pointer',
            fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            transition: 'background 0.2s'
          }}
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
