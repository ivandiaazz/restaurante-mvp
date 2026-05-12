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
    const reply = data.content[0].text
    setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Carta — Mesa {tableId}</h1>
      <div style={{ marginBottom: 24 }}>
        {platos.map(plato => (
          <div key={plato.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{plato.nombre}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{plato.descripcion}</div>
              <div style={{ fontSize: 13, color: '#999' }}>{plato.alergenos}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 500 }}>{plato.precio}€</div>
              <button onClick={() => addToCarrito(plato)} style={{ marginTop: 4, padding: '4px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Añadir</button>
            </div>
          </div>
        ))}
      </div>
      {carrito.length > 0 && (
        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Tu pedido</h2>
          {carrito.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
              <span>{p.cantidad}× {p.nombre}</span>
              <span>{(p.precio * p.cantidad).toFixed(2)}€</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8, fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
            <span>Total</span><span>{total.toFixed(2)}€</span>
          </div>
          <button onClick={() => navigate(`/order/${restaurantId}/${tableId}`, { state: { carrito } })} style={{ marginTop: 12, width: '100%', padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>Confirmar pedido</button>
        </div>
      )}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Asistente IA</h2>
        <div style={{ height: 200, overflowY: 'auto', marginBottom: 8 }}>
          {chatMessages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, textAlign: m.role === 'user' ? 'right' : 'left' }}>
              <span style={{ background: m.role === 'user' ? '#000' : '#f0f0f0', color: m.role === 'user' ? '#fff' : '#000', padding: '6px 10px', borderRadius: 8, fontSize: 13, display: 'inline-block', maxWidth: '80%' }}>{m.content}</span>
            </div>
          ))}
          {loading && <div style={{ fontSize: 13, color: '#999' }}>Escribiendo...</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Pregunta sobre el menú..." style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
          <button onClick={sendMessage} style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Enviar</button>
        </div>
      </div>
    </div>
  )
}