import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Gracias() {
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('pedido_id')
  const email = searchParams.get('email')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!pedidoId) return

    async function finalizarPedido() {
      // Marcar como pagado y leer los datos del pedido en una sola consulta
      const [{ data: pedido }] = await Promise.all([
        supabase.from('pedidos').select('restaurante_id, mesa, items, total, email_cliente').eq('id', pedidoId).single(),
        supabase.from('pedidos').update({ estado: 'pagado' }).eq('id', pedidoId),
      ])

      setListo(true)

      if (!pedido) return

      // Ticket de compra (fire and forget)
      if (email) {
        fetch('/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            restaurantId: pedido.restaurante_id,
            mesa: pedido.mesa,
            items: pedido.items,
            total: pedido.total,
          }),
        }).catch(() => {})
      }

      // Email de valoración diferido 2h (fire and forget)
      if (pedido.email_cliente) {
        fetch('/api/send-review-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedidoId,
            restauranteId: pedido.restaurante_id,
            emailCliente: pedido.email_cliente,
            mesa: pedido.mesa,
          }),
        })
          .then(r => r.json().then(j => console.log('[send-review-email] programado:', r.status, j)))
          .catch(err => console.error('[send-review-email] error:', err.message))
      }
    }

    finalizarPedido()
  }, [pedidoId, email])

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: '#fff' }}>✓</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -1 }}>¡Pago completado!</div>
        <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>
          Tu pedido ha sido confirmado.<br />En breve te lo traemos a la mesa.
        </div>
        {listo && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#aeaeb2' }}>
            {email ? `Ticket enviado a ${email}` : 'Pedido registrado'}
          </div>
        )}
      </div>
    </div>
  )
}
