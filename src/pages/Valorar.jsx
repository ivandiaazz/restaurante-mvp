import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

const LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!']

export default function Valorar() {
  const { pedidoId } = useParams()

  const [loading, setLoading] = useState(true)
  const [pedido, setPedido] = useState(null)
  const [nombreRestaurante, setNombreRestaurante] = useState('')
  const [googlePlaceId, setGooglePlaceId] = useState(null)
  const [yaValorado, setYaValorado] = useState(false)
  const [puntuacion, setPuntuacion] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!pedidoId) { setLoading(false); return }

    async function cargar() {
      const [{ data: p }, { data: existente }] = await Promise.all([
        supabase.from('pedidos').select('restaurante_id, mesa').eq('id', pedidoId).single(),
        supabase.from('valoraciones').select('id').eq('pedido_id', pedidoId).maybeSingle(),
      ])

      if (!p) { setLoading(false); return }
      setPedido(p)

      if (existente) { setYaValorado(true); setLoading(false); return }

      const { data: rest } = await supabase
        .from('restaurants')
        .select('nombre, google_place_id')
        .eq('slug', p.restaurante_id)
        .single()
      setNombreRestaurante(rest?.nombre ?? p.restaurante_id)
      setGooglePlaceId(rest?.google_place_id ?? null)
      setLoading(false)
    }

    cargar()
  }, [pedidoId])

  async function enviar() {
    if (!puntuacion) { setErrorMsg('Selecciona una puntuación'); return }
    setEnviando(true)
    setErrorMsg('')

    const { error: dbErr } = await supabase.from('valoraciones').insert({
      pedido_id: pedidoId,
      restaurante_id: pedido.restaurante_id,
      mesa: pedido.mesa,
      puntuacion,
      comentario: comentario.trim() || null,
    })

    setEnviando(false)
    if (dbErr) {
      setErrorMsg('No se pudo guardar la valoración. Inténtalo de nuevo.')
      return
    }
    setEnviado(true)
  }

  // ── Estados especiales ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: '#aeaeb2' }}>Cargando…</div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>Enlace no válido</div>
          <div style={{ fontSize: 14, color: '#6e6e73' }}>No encontramos el pedido asociado a este enlace.</div>
        </div>
      </div>
    )
  }

  if (yaValorado) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>⭐</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -0.5 }}>Ya valoraste este pedido</div>
          <div style={{ fontSize: 15, color: '#6e6e73' }}>¡Gracias por compartir tu opinión!</div>
        </div>
      </div>
    )
  }

  if (enviado) {
    const showGoogleBtn = puntuacion >= 4 && googlePlaceId
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 72, height: 72, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: '#fff' }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 10, letterSpacing: -0.5 }}>¡Gracias por tu valoración!</div>
          <div style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>Tu opinión nos ayuda a seguir mejorando.</div>
          {showGoogleBtn && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 14, color: '#6e6e73', marginBottom: 14, lineHeight: 1.5 }}>
                ¿Te ha gustado? ¡Cuéntaselo a todos en Google!
              </div>
              <a
                href={`https://search.google.com/local/writereview?placeid=${googlePlaceId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#111', color: '#fff', textDecoration: 'none',
                  padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}
              >
                <span>Dejar reseña en Google</span>
                <span style={{ fontSize: 16 }}>⭐</span>
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────────

  const activeStar = hoveredStar || puntuacion

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '56px 24px 28px', borderBottom: '1px solid #f2f2f7' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>
          {nombreRestaurante}{pedido.mesa ? ` · Mesa ${pedido.mesa}` : ''}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#111', letterSpacing: -1.2, lineHeight: 1.1 }}>
          ¿Cómo fue tu experiencia?
        </div>
      </div>

      <div style={{ padding: '32px 24px' }}>

        {/* Estrellas */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', marginBottom: 16 }}>Tu puntuación</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setPuntuacion(n)}
                onMouseEnter={() => setHoveredStar(n)}
                onMouseLeave={() => setHoveredStar(0)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                  fontSize: 44, lineHeight: 1,
                  color: n <= activeStar ? '#f59e0b' : '#e5e7eb',
                  transition: 'color 0.1s',
                }}
              >
                ★
              </button>
            ))}
          </div>
          <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 8, height: 20 }}>
            {activeStar > 0 ? LABELS[activeStar] : ''}
          </div>
        </div>

        {/* Comentario */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6e6e73', marginBottom: 8 }}>
            Cuéntanos más <span style={{ fontWeight: 400, color: '#aeaeb2' }}>(opcional)</span>
          </label>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="¿Qué te gustó más? ¿Algo que podríamos mejorar?"
            rows={4}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',
              background: '#f5f5f7', fontSize: 15, outline: 'none', color: '#111',
              fontFamily: font, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5,
            }}
          />
        </div>

        {errorMsg && (
          <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando}
          style={{
            width: '100%', padding: '16px 20px',
            background: enviando ? '#6e6e73' : '#111', color: '#fff',
            border: 'none', borderRadius: 16, cursor: enviando ? 'default' : 'pointer',
            fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)', transition: 'background 0.2s',
          }}
        >
          {enviando ? 'Enviando…' : 'Enviar valoración'}
        </button>

      </div>
    </div>
  )
}
