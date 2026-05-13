import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

export default function Order() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
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
      total,
      estado: 'nuevo'
    })
    if (!error) setPedidoEnviado(true)
    setLoading(false)
  }

  if (pedidoEnviado) return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, background: '#111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 28, color: '#fff'
        }}>✓</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -1 }}>
          Pedido enviado
        </div>
        <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>
          La cocina ya tiene tu pedido.<br />En breve te lo traemos.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh'
    }}>
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

        {/* Botón confirmar */}
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
          {loading ? 'Enviando...' : 'Confirmar y enviar a cocina'}
        </button>
      </div>
    </div>
  )
}
