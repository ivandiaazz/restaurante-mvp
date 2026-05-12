import { useLocation, useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

export default function Order() {
  const { restaurantId, tableId } = useParams()
  const { state } = useLocation()
  const carrito = state?.carrito || []
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)

  async function confirmarPedido() {
    setLoading(true)
    const { error } = await supabase.from('pedidos').insert({
      restaurante_id: restaurantId,
      mesa: tableId,
      items: carrito,
      total: total,
      estado: 'nuevo'
    })
    if (!error) setPedidoEnviado(true)
    setLoading(false)
  }

  if (pedidoEnviado) return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#1a1a1a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>¡Pedido enviado!</div>
        <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>La cocina ya tiene tu pedido.<br/>En breve te lo traemos.</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ background: '#1a1a1a', padding: '20px 20px 16px' }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Mesa {tableId}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Tu pedido</div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {carrito.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{p.cantidad}×</span>
                <span style={{ color: '#1a1a1a', marginLeft: 8 }}>{p.nombre}</span>
              </div>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{(p.precio * p.cantidad).toFixed(2)}€</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
            <span>Total</span>
            <span>{total.toFixed(2)}€</span>
          </div>
        </div>

        <button onClick={confirmarPedido} disabled={loading} style={{ width: '100%', padding: 16, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
          {loading ? 'Enviando...' : 'Confirmar y enviar a cocina'}
        </button>
      </div>
    </div>
  )
}