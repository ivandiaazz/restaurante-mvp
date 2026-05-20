import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GOLD  = '#c9a465'
const BG    = '#0f0f0f'
const SURF  = '#1a1a1a'
const TEXT  = '#f0ebe0'
const MUTED = '#7a6a54'
const SEP   = 'rgba(201,164,101,0.12)'
const font  = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reservar() {
  const { restaurantId } = useParams()
  const [restaurantInfo, setRestaurantInfo] = useState(null)
  const [form, setForm] = useState({ nombre: '', telefono: '', fecha: '', hora: '', personas: 2, nota: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.from('restaurants').select('nombre, tipo, ciudad').eq('slug', restaurantId).single()
      .then(({ data }) => { if (data) setRestaurantInfo(data) })
  }, [restaurantId])

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function reservar() {
    const { nombre, telefono, fecha, hora, personas } = form
    if (!nombre.trim() || !telefono.trim() || !fecha || !hora) {
      setErrorMsg('Por favor completa nombre, teléfono, fecha y hora.')
      return
    }
    setEnviando(true)
    setErrorMsg('')
    const { error } = await supabase.from('reservas').insert({
      restaurante_id: restaurantId,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fecha,
      hora,
      personas,
      nota: form.nota.trim() || null,
      estado: 'pendiente',
    })
    setEnviando(false)
    if (error) { setErrorMsg('No se pudo enviar la reserva. Inténtalo de nuevo.'); return }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: GOLD, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32, color: BG }}>✓</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 12, letterSpacing: -1 }}>¡Reserva enviada!</div>
          <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
            En breve el restaurante te confirmará<br />por WhatsApp.
          </div>
        </div>
      </div>
    )
  }

  const heroNombre = restaurantInfo?.nombre ?? ''
  const heroSub = restaurantInfo ? `${restaurantInfo.tipo} · ${restaurantInfo.ciudad}` : ''

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: BG, minHeight: '100vh' }}>

      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80" alt={heroNombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 22px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Reservar mesa</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: -0.5, lineHeight: 1.1 }}>{heroNombre}</div>
          {heroSub && <div style={{ fontSize: 11, color: 'rgba(240,235,224,0.45)', marginTop: 4, letterSpacing: 2, textTransform: 'uppercase' }}>{heroSub}</div>}
        </div>
      </div>

      <div style={{ padding: '28px 24px 56px', display: 'grid', gap: 20 }}>

        <div>
          <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 8 }}>Nombre</label>
          <input
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Tu nombre completo"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: SURF, fontSize: 15, outline: 'none', color: TEXT, fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 8 }}>Teléfono</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={e => set('telefono', e.target.value)}
            placeholder="+34 600 000 000"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: SURF, fontSize: 15, outline: 'none', color: TEXT, fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 8 }}>Fecha</label>
            <input
              type="date"
              min={todayStr()}
              value={form.fecha}
              onChange={e => set('fecha', e.target.value)}
              style={{ width: '100%', padding: '14px 12px', borderRadius: 12, border: 'none', background: SURF, fontSize: 14, outline: 'none', color: TEXT, fontFamily: font, boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 8 }}>Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={e => set('hora', e.target.value)}
              style={{ width: '100%', padding: '14px 12px', borderRadius: 12, border: 'none', background: SURF, fontSize: 14, outline: 'none', color: TEXT, fontFamily: font, boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 12 }}>Personas</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button onClick={() => set('personas', Math.max(1, form.personas - 1))} style={{ width: 44, height: 44, borderRadius: '50%', background: SURF, border: `1px solid ${SEP}`, fontSize: 24, cursor: 'pointer', color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
            <span style={{ fontSize: 36, fontWeight: 700, color: TEXT, minWidth: 44, textAlign: 'center' }}>{form.personas}</span>
            <button onClick={() => set('personas', Math.min(20, form.personas + 1))} style={{ width: 44, height: 44, borderRadius: '50%', background: SURF, border: `1px solid ${SEP}`, fontSize: 24, cursor: 'pointer', color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD, fontWeight: 600, marginBottom: 8 }}>
            Nota <span style={{ color: MUTED, fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(opcional)</span>
          </label>
          <textarea
            value={form.nota}
            onChange={e => set('nota', e.target.value)}
            placeholder="Alergias, ocasión especial, petición de mesa..."
            rows={3}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: SURF, fontSize: 14, outline: 'none', color: TEXT, fontFamily: font, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {errorMsg && (
          <div style={{ fontSize: 13, color: '#fca5a5', background: 'rgba(220,38,38,0.12)', borderRadius: 10, padding: '12px 16px' }}>
            {errorMsg}
          </div>
        )}

        <button
          onClick={reservar}
          disabled={enviando}
          style={{ padding: '16px 20px', background: enviando ? MUTED : GOLD, color: BG, border: 'none', borderRadius: 16, cursor: enviando ? 'default' : 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: 0.2, boxShadow: enviando ? 'none' : '0 4px 24px rgba(201,164,101,0.35)', transition: 'background 0.2s' }}
        >
          {enviando ? 'Enviando…' : 'Reservar mesa'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: MUTED }}>
          Te confirmaremos la reserva por WhatsApp
        </div>
      </div>
    </div>
  )
}
