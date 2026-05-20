import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Gracias() {
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('pedido_id')
  const email = searchParams.get('email')
  const isSplit = searchParams.get('split') === '1'
  const persona = parseInt(searchParams.get('persona') ?? '0', 10)
  const totalPersonas = parseInt(searchParams.get('total_personas') ?? '0', 10)

  const [listo, setListo] = useState(false)
  const [pedidoCompleto, setPedidoCompleto] = useState(false)
  const [faltanPagos, setFaltanPagos] = useState(0)

  useEffect(() => {
    if (!pedidoId) return
    if (isSplit) {
      finalizarPagoDividido()
    } else {
      finalizarPedido()
    }
  }, [pedidoId])

  async function finalizarPagoDividido() {
    // Mark this person's split as pagado
    await supabase
      .from('pagos_divididos')
      .update({ estado: 'pagado' })
      .eq('pedido_id', pedidoId)
      .eq('numero_persona', persona)

    // Count how many are pagado for this pedido
    const { data: pagos } = await supabase
      .from('pagos_divididos')
      .select('estado')
      .eq('pedido_id', pedidoId)

    const pagados = (pagos ?? []).filter(p => p.estado === 'pagado').length
    const faltan = totalPersonas - pagados

    setFaltanPagos(Math.max(0, faltan))
    setListo(true)

    if (faltan <= 0) {
      // Everyone has paid — finalize the order
      setPedidoCompleto(true)
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('restaurante_id, mesa, email_cliente')
        .eq('id', pedidoId)
        .single()

      await supabase.from('pedidos').update({ estado: 'pagado' }).eq('id', pedidoId)

      if (pedido?.email_cliente) {
        fetch('/api/send-review-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedidoId,
            restauranteId: pedido.restaurante_id,
            emailCliente: pedido.email_cliente,
            mesa: pedido.mesa,
          }),
        }).catch(() => {})
      }
    }
  }

  async function finalizarPedido() {
    const [{ data: pedido }] = await Promise.all([
      supabase.from('pedidos').select('restaurante_id, mesa, items, total, email_cliente').eq('id', pedidoId).single(),
      supabase.from('pedidos').update({ estado: 'pagado' }).eq('id', pedidoId),
    ])

    setListo(true)

    if (!pedido) return

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

  // ── Split: waiting for others ──────────────────────────────────────────────
  if (isSplit && listo && !pedidoCompleto) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: '#fff' }}>✓</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -1 }}>Tu parte está pagada</div>
          <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>
            {faltanPagos === 1
              ? 'Esperando a 1 persona más.'
              : `Esperando a ${faltanPagos} personas más.`}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#aeaeb2' }}>
            Persona {persona} de {totalPersonas}
          </div>
        </div>
      </div>
    )
  }

  // ── Default: full payment confirmed ────────────────────────────────────────
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
