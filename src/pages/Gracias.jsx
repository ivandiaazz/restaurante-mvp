import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Gracias() {
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('pedido_id')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!pedidoId) return
    supabase
      .from('pedidos')
      .update({ estado: 'pagado' })
      .eq('id', pedidoId)
      .then(() => setListo(true))
  }, [pedidoId])

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: '#fff' }}>✓</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -1 }}>¡Pago completado!</div>
        <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>
          Tu pedido ha sido confirmado.<br />En breve te lo traemos a la mesa.
        </div>
        {listo && <div style={{ marginTop: 8, fontSize: 12, color: '#aeaeb2' }}>Pedido registrado</div>}
      </div>
    </div>
  )
}