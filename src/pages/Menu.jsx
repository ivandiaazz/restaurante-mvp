import { useEffect, useState, useRef } from 'react'
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
    { role: 'assistant', content: '¡Hola! Puedo ayudarte con el menú, alérgenos y recomendaciones.' }
  ])
  const [loading, setLoading] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => { fetchPlatos() }, [])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatMessages])

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

  function removeFromCarrito(plato) {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === plato.id)
      if (existe && existe.cantidad > 1) return prev.map(p => p.id === plato.id ? { ...p, cantidad: p.cantidad - 1 } : p)
      return prev.filter(p => p.id !== plato.id)
    })
  }

  async function sendMessage() {
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setLoading(true)
    try {
      const menuTexto = platos.map(p =>
        `${p.nombre}: ${p.descripcion}. Precio: ${p.precio}€. Alérgenos: ${p.alergenos || 'ninguno'}`
      ).join('\n')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          system: `Eres el asistente de un restaurante. Conoces el menú al detalle. Sé amable, conciso y útil. El menú es:\n${menuTexto}`
        })
      })
      const json = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: json.reply ?? 'Lo siento, inténtalo de nuevo.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar.' }])
    }
    setLoading(false)
  }

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)
  const totalItems = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px', borderBottom: '1px solid #f2f2f7' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>
          Mesa {tableId}
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1 }}>
          Carta
        </div>
      </div>

      {/* Lista de platos */}
      <div style={{ paddingBottom: 220 }}>
        {platos.map(plato => {
          const enCarrito = carrito.find(p => p.id === plato.id)
          return (
            <div key={plato.id} style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f2f2f7',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4, lineHeight: 1.3 }}>
                  {plato.nombre}
                </div>
                {plato.descripcion && (
                  <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: plato.alergenos ? 6 : 0 }}>
                    {plato.descripcion}
                  </div>
                )}
                {plato.alergenos && (
                  <div style={{ fontSize: 11, color: '#aeaeb2', letterSpacing: 0.3 }}>
                    {plato.alergenos}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
                  {Number(plato.precio).toFixed(2)}€
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {enCarrito && (
                    <>
                      <button
                        onClick={() => removeFromCarrito(plato)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#f2f2f7', border: 'none',
                          fontSize: 18, cursor: 'pointer', color: '#111',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                        }}
                      >−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 18, textAlign: 'center', color: '#111' }}>
                        {enCarrito.cantidad}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => addToCarrito(plato)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#111', border: 'none',
                      fontSize: 20, cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                    }}
                  >+</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón ver pedido */}
      {carrito.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20
        }}>
          <button
            onClick={() => navigate(`/order/${restaurantId}/${tableId}`, { state: { carrito } })}
            style={{
              width: '100%', padding: '16px 20px',
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 16, cursor: 'pointer',
              fontSize: 15, fontWeight: 600,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
            }}
          >
            <span style={{
              background: '#fff', color: '#111', borderRadius: '50%',
              width: 26, height: 26, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700
            }}>{totalItems}</span>
            <span>Ver pedido</span>
            <span>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}

      {/* Chat asistente */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20
      }}>
        {chatAbierto && (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '20px 20px 16px', marginBottom: 10,
            boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: '1px solid #f2f2f7'
          }}>
            <div ref={chatRef} style={{ height: 200, overflowY: 'auto', marginBottom: 14 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 8, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <span style={{
                    background: m.role === 'user' ? '#111' : '#f2f2f7',
                    color: m.role === 'user' ? '#fff' : '#111',
                    padding: '9px 13px', borderRadius: 14,
                    fontSize: 13, display: 'inline-block', maxWidth: '85%', lineHeight: 1.5
                  }}>
                    {m.content}
                  </span>
                </div>
              ))}
              {loading && (
                <div style={{ fontSize: 13, color: '#aeaeb2', padding: '4px 13px', letterSpacing: 2 }}>···</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Pregunta sobre el menú..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  border: 'none', fontSize: 13, outline: 'none',
                  background: '#f5f5f7', color: '#111'
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: '10px 16px', background: '#111', color: '#fff',
                  border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16
                }}
              >↑</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatAbierto(!chatAbierto)}
          style={{
            width: '100%', padding: 14,
            background: chatAbierto ? '#f5f5f7' : '#111',
            color: chatAbierto ? '#111' : '#fff',
            border: 'none', borderRadius: 14, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, letterSpacing: 0.3
          }}
        >
          {chatAbierto ? 'Cerrar asistente' : 'Asistente IA · Pregunta lo que quieras'}
        </button>
      </div>
    </div>
  )
}
