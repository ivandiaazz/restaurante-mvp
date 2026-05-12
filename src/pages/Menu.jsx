import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

export default function Menu() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const [platos, setPlatos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente. Puedo ayudarte con el menú, alérgenos y recomendaciones. ¿Qué te apetece hoy?' }
  ])
  const [loading, setLoading] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)

  useEffect(() => { fetchPlatos() }, [])

  async function fetchPlatos() {
    const { data } = await supabase.from('platos').select('*').eq('restaurante_id', restaurantId).eq('activo', true)
    if (data) setPlatos(data)
  }

  function addToCarrito(plato) {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === plato.id)
      if (existe) return prev.map(p => p.id === plato.id ? { ...p, cantidad: p.cantidad + 1 } : p)
      return [...prev, { ...plato, cantidad: 1 }]
    })
  }

  async function sendMessage() {
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setLoading(true)

    try {
      const menuTexto = platos.map(p => `${p.nombre}: ${p.descripcion}. Precio: ${p.precio}€. Alérgenos: ${p.alergenos || 'ninguno'}`).join('\n')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          system: `Eres el asistente de un restaurante. Conoces el menú al detalle y ayudas a los clientes a elegir. Sé amable y breve. El menú de hoy es:\n${menuTexto}`
        })
      })
      const data = await response.json()
      const reply = String(data?.reply || 'Lo siento, no pude responder.')
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar.' }])
    }
    setLoading(false)
  }

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)
  const totalItems = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto', background: '#f8f7f4', minHeight: '100vh' }}>
      
      <div style={{ background: '#1a1a1a', padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Mesa {tableId}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Carta</div>
      </div>

      <div style={{ padding: '16px 16px 120px' }}>
        {platos.map(plato => (
          <div key={plato.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a', marginBottom: 3 }}>{plato.nombre}</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4, marginBottom: 6 }}>{plato.descripcion}</div>
                {plato.alergenos && <div style={{ fontSize: 11, color: '#bbb', background: '#f5f5f5', display: 'inline-block', padding: '2px 8px', borderRadius: 20 }}>{plato.alergenos}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginBottom: 8 }}>{plato.precio}€</div>
                <button onClick={() => addToCarrito(plato)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
          <button onClick={() => navigate(`/order/${restaurantId}/${tableId}`, { state: { carrito } })} style={{ width: '100%', padding: '16px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ background: '#fff', color: '#1a1a1a', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{totalItems}</span>
            <span>Ver pedido</span>
            <span>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
        {chatAbierto && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
            <div style={{ height: 180, overflowY: 'auto', marginBottom: 12 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 8, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <span style={{ background: m.role === 'user' ? '#1a1a1a' : '#f5f5f5', color: m.role === 'user' ? '#fff' : '#1a1a1a', padding: '8px 12px', borderRadius: 12, fontSize: 13, display: 'inline-block', maxWidth: '85%', lineHeight: 1.4 }}>{m.content}</span>
                </div>
              ))}
              {loading && <div style={{ fontSize: 12, color: '#bbb', padding: '4px 12px' }}>Escribiendo...</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Pregunta sobre el menú..." style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #eee', fontSize: 13, outline: 'none' }} />
              <button onClick={sendMessage} style={{ padding: '10px 16px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>↑</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatAbierto(!chatAbierto)} style={{ width: '100%', padding: '14px', background: chatAbierto ? '#f5f5f5' : '#1a1a1a', color: chatAbierto ? '#1a1a1a' : '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          {chatAbierto ? 'Cerrar asistente' : '💬 Pregunta al asistente IA'}
        </button>
      </div>
    </div>
  )
}