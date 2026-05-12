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
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h1 style={{ fontSize: 22 }}>¡Pedido enviado!</h1>
      <p style={{ color: '#666' }}>La cocina ya tiene tu pedido. En breve te lo traemos.</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Confirmar pedido — Mesa {tableId}</h1>
      {carrito.map(p => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
          <span>{p.cantidad}× {p.nombre}</span>
          <span>{(p.precio * p.cantidad).toFixed(2)}€</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 500, fontSize: 16 }}>
        <span>Total</span><span>{total.toFixed(2)}€</span>
      </div>
      <button onClick={confirmarPedido} disabled={loading} style={{ width: '100%', padding: 12, background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
        {loading ? 'Enviando...' : 'Enviar pedido a cocina'}
      </button>
    </div>
  )
}