import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

const GOLD   = '#c9a465'
const BG     = '#0f0f0f'
const SURF   = '#1a1a1a'
const TEXT   = '#f0ebe0'
const MUTED  = '#7a6a54'
const SEP    = 'rgba(201,164,101,0.12)'
const font   = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

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
  const [fetchError, setFetchError] = useState('')
  const chatRef = useRef(null)

  useEffect(() => { fetchPlatos() }, [])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatMessages])

  async function fetchPlatos() {
    const { data, error } = await supabase.from('platos').select('*').eq('restaurante_id', restaurantId).eq('activo', true)
    if (error) {
      console.error('[menu] fetchPlatos error:', error)
      setFetchError(error.message)
      return
    }
    console.log(`[menu] fetchPlatos: ${data?.length ?? 0} platos para restaurante_id="${restaurantId}"`)
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
          system: `Eres el asistente del Gastro Gaudí, un gastrobar moderno en Mataró. Conoces el menú al detalle. Sé amable, conciso y con personalidad. El menú es:\n${menuTexto}`
        })
      })
      const json = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: json.reply ?? 'Lo siento, inténtalo de nuevo.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar.' }])
    }
    setLoading(false)
  }

  const total      = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0)
  const totalItems = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: BG, minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 230, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
          alt="Gastro Gaudí terraza"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* gradiente oscuro */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)'
        }} />
        {/* texto sobre imagen */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 22px' }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: GOLD,
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 6
          }}>
            Mesa {tableId}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: TEXT, letterSpacing: -0.5, lineHeight: 1.1 }}>
            Gastro Gaudí
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(240,235,224,0.45)',
            marginTop: 5, letterSpacing: 2, textTransform: 'uppercase'
          }}>
            Gastrobar · Mataró
          </div>
        </div>
      </div>

      {/* ── Lista de platos ── */}
      <div style={{ paddingBottom: 220 }}>
        {fetchError && (
          <div style={{ padding: '20px 24px', color: '#dc2626', fontSize: 13 }}>
            Error cargando el menú: {fetchError}
          </div>
        )}
        {!fetchError && platos.length === 0 && (
          <div style={{ padding: '40px 24px', color: MUTED, fontSize: 14, textAlign: 'center' }}>
            Cargando carta…
          </div>
        )}
        {platos.map(plato => {
          const enCarrito = carrito.find(p => p.id === plato.id)
          return (
            <div key={plato.id} style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${SEP}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 14, alignItems: 'center' }}>
                {plato.imagen_url && (
                  <img
                    src={plato.imagen_url}
                    alt={plato.nombre}
                    style={{
                      width: 68, height: 68, borderRadius: 10,
                      objectFit: 'cover', flexShrink: 0, background: SURF
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 3, lineHeight: 1.3 }}>
                    {plato.nombre}
                  </div>
                  {plato.descripcion && (
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: plato.alergenos ? 5 : 0 }}>
                      {plato.descripcion}
                    </div>
                  )}
                  {plato.alergenos && (
                    <div style={{ fontSize: 10, color: '#4a3a28', letterSpacing: 0.3 }}>
                      {plato.alergenos}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
                  {Number(plato.precio).toFixed(2)}€
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {enCarrito && (
                    <>
                      <button
                        onClick={() => removeFromCarrito(plato)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: SURF, border: `1px solid ${SEP}`,
                          fontSize: 18, cursor: 'pointer', color: TEXT,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                        }}
                      >−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 18, textAlign: 'center', color: TEXT }}>
                        {enCarrito.cantidad}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => addToCarrito(plato)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: GOLD, border: 'none',
                      fontSize: 20, cursor: 'pointer', color: BG,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      fontWeight: 700
                    }}
                  >+</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Botón ver pedido ── */}
      {carrito.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20
        }}>
          <button
            onClick={() => navigate(`/order/${restaurantId}/${tableId}`, { state: { carrito } })}
            style={{
              width: '100%', padding: '16px 20px',
              background: GOLD, color: BG, border: 'none',
              borderRadius: 16, cursor: 'pointer',
              fontSize: 15, fontWeight: 700,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 4px 24px rgba(201,164,101,0.35)'
            }}
          >
            <span style={{
              background: BG, color: GOLD, borderRadius: '50%',
              width: 26, height: 26, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700
            }}>{totalItems}</span>
            <span>Ver pedido</span>
            <span>{total.toFixed(2)}€</span>
          </button>
        </div>
      )}

      {/* ── Chat asistente ── */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20
      }}>
        {chatAbierto && (
          <div style={{
            background: SURF, borderRadius: 20, padding: '20px 20px 16px', marginBottom: 10,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)', border: `1px solid ${SEP}`
          }}>
            <div ref={chatRef} style={{ height: 200, overflowY: 'auto', marginBottom: 14 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 8, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <span style={{
                    background: m.role === 'user' ? GOLD : '#252525',
                    color: m.role === 'user' ? BG : TEXT,
                    padding: '9px 13px', borderRadius: 14,
                    fontSize: 13, display: 'inline-block', maxWidth: '85%', lineHeight: 1.5
                  }}>
                    {m.content}
                  </span>
                </div>
              ))}
              {loading && (
                <div style={{ fontSize: 13, color: MUTED, padding: '4px 13px', letterSpacing: 3 }}>···</div>
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
                  border: `1px solid ${SEP}`, fontSize: 13, outline: 'none',
                  background: '#252525', color: TEXT,
                  fontFamily: font
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: '10px 16px', background: GOLD, color: BG,
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  fontSize: 16, fontWeight: 700
                }}
              >↑</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatAbierto(!chatAbierto)}
          style={{
            width: '100%', padding: 14,
            background: SURF,
            color: GOLD,
            border: `1px solid rgba(201,164,101,0.22)`,
            borderRadius: 14, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, letterSpacing: 0.3,
            fontFamily: font
          }}
        >
          {chatAbierto ? 'Cerrar asistente' : 'Asistente IA · Pregunta lo que quieras'}
        </button>
      </div>
    </div>
  )
}
