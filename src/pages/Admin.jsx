import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const estadoConfig = {
  pendiente_pago: { label: 'Pendiente pago', dot: '#9ca3af', bg: '#f9fafb', text: '#6b7280' },
  nuevo:          { label: 'Nuevo',          dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  pagado:         { label: 'Pagado',         dot: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  preparando:     { label: 'Preparando',     dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  listo:          { label: 'Listo',          dot: '#22c55e', bg: '#f0fdf4', text: '#166534' },
}

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Admin() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [tab, setTab] = useState('pedidos')
  const [pedidos, setPedidos] = useState([])
  const [platos, setPlatos] = useState([])
  const [nuevoPlato, setNuevoPlato] = useState({ nombre: '', descripcion: '', precio: '', alergenos: '', imagen_url: '' })
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [numMesas, setNumMesas] = useState(10)
  const [restaurantInfo, setRestaurantInfo] = useState(null)
  const [pushStatus, setPushStatus] = useState('idle') // idle | granted | denied | unsupported

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  }

  async function registrarPush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[push] Web Push no soportado en este navegador')
      setPushStatus('unsupported')
      return
    }
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      console.log('[push] VITE_VAPID_PUBLIC_KEY definida:', !!vapidKey, vapidKey ? `(${vapidKey.slice(0, 20)}…)` : '(FALTA)')

      const permission = await Notification.requestPermission()
      console.log('[push] permiso de notificaciones:', permission)
      if (permission !== 'granted') { setPushStatus('denied'); return }

      const registration = await navigator.serviceWorker.ready
      console.log('[push] Service Worker listo, scope:', registration.scope)

      const existing = await registration.pushManager.getSubscription()
      console.log('[push] suscripción existente:', existing ? `…${existing.endpoint.slice(-40)}` : 'ninguna')

      const pushSub = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      console.log('[push] endpoint activo:', `…${pushSub.endpoint.slice(-40)}`)

      const { error: upsertErr } = await supabase
        .from('push_subscriptions')
        .upsert(
          { restaurante_id: restaurantId, endpoint: pushSub.endpoint, subscription: pushSub.toJSON() },
          { onConflict: 'restaurante_id,endpoint' }
        )

      if (upsertErr) {
        console.error('[push] error guardando suscripción en Supabase:', upsertErr.code, upsertErr.message)
        setPushStatus('denied')
      } else {
        console.log('[push] suscripción guardada en Supabase ✓')
        setPushStatus('granted')
      }
    } catch (err) {
      console.error('[push] error inesperado:', err.message, err)
      setPushStatus('denied')
    }
  }

  useEffect(() => {
    fetchRestaurantInfo()
    fetchPedidos()
    fetchPlatos()
    registrarPush()

    const sub = supabase
      .channel(`pedidos-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurantId}` },
        payload => { setPedidos(prev => [payload.new, ...prev]) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurantId}` },
        payload => { setPedidos(prev => prev.map(p => p.id === payload.new.id ? payload.new : p)) }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [restaurantId])

  async function fetchRestaurantInfo() {
    const { data } = await supabase
      .from('restaurants')
      .select('nombre, tipo, ciudad')
      .eq('slug', restaurantId)
      .single()
    if (data) setRestaurantInfo(data)
  }

  async function fetchPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('restaurante_id', restaurantId)
      .order('created_at', { ascending: false })
    if (data) setPedidos(data)
  }

  async function fetchPlatos() {
    const { data } = await supabase
      .from('platos')
      .select('*')
      .eq('restaurante_id', restaurantId)
      .order('nombre')
    if (data) setPlatos(data)
  }

  async function agregarPlato() {
    setErrorMsg('')
    setOkMsg('')
    const nombre = nuevoPlato.nombre?.trim()
    const precio = nuevoPlato.precio?.toString().trim()
    if (!nombre || !precio) {
      setErrorMsg('Nombre y precio son obligatorios.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre,
      descripcion: nuevoPlato.descripcion?.trim() ?? '',
      precio: parseFloat(precio),
      alergenos: nuevoPlato.alergenos?.trim() ?? '',
      restaurante_id: restaurantId,
      activo: true,
    }
    if (nuevoPlato.imagen_url?.trim()) payload.imagen_url = nuevoPlato.imagen_url.trim()

    const { data, error, status } = await supabase.from('platos').insert(payload).select()
    setGuardando(false)
    if (error) {
      setErrorMsg(`Error [${status}]: ${error.message}`)
      return
    }
    if (!data || data.length === 0) {
      setErrorMsg(`Sin respuesta del servidor (HTTP ${status}). Revisa permisos RLS en la tabla "platos".`)
      return
    }
    setOkMsg(`"${nombre}" añadido correctamente.`)
    setNuevoPlato({ nombre: '', descripcion: '', precio: '', alergenos: '', imagen_url: '' })
    setFormKey(k => k + 1)
    fetchPlatos()
  }

  async function togglePlato(plato) {
    await supabase.from('platos').update({ activo: !plato.activo }).eq('id', plato.id)
    fetchPlatos()
  }

  async function cambiarEstado(pedido, estado) {
    await supabase.from('pedidos').update({ estado }).eq('id', pedido.id)
    fetchPedidos()
  }

  function descargarQR(mesa) {
    const canvas = document.getElementById(`qr-canvas-${mesa}`)
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `mesa-${mesa}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const pedidosActivos = pedidos.filter(p => p.estado !== 'listo')
  const nombreRestaurante = restaurantInfo?.nombre ?? restaurantId

  return (
    <div style={{ fontFamily: font, maxWidth: 600, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>

      <div style={{ padding: '56px 24px 0', borderBottom: '1px solid #f2f2f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 500 }}>
            {restaurantInfo?.tipo ? `${restaurantInfo.tipo} · ${restaurantInfo.ciudad}` : 'Restaurante'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pushStatus === 'granted' && (
              <span title="Notificaciones activas" style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
            )}
            {pushStatus === 'denied' && (
              <span title="Notificaciones desactivadas — actívalas en la configuración del navegador" style={{ fontSize: 18, lineHeight: 1, opacity: 0.5 }}>🔕</span>
            )}
            <button
              onClick={handleSignOut}
              style={{
                background: 'none', border: '1px solid #e8e8ed', borderRadius: 8,
                cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#6e6e73',
                padding: '5px 12px', fontFamily: font
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1, marginBottom: 24 }}>
          {nombreRestaurante}
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {['pedidos', 'carta', 'qr'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px 12px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: font,
                color: tab === t ? '#111' : '#aeaeb2',
                borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                letterSpacing: 0.2, transition: 'color 0.15s'
              }}
            >
              {t === 'pedidos'
                ? `Pedidos${pedidosActivos.length ? ` (${pedidosActivos.length})` : ''}`
                : t === 'carta' ? 'Carta' : 'QR Mesas'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pedidos' && (
        <div style={{ padding: '16px 24px' }}>
          {pedidosActivos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#aeaeb2', fontSize: 15 }}>
              Sin pedidos activos
            </div>
          )}
          {pedidosActivos.map(pedido => {
            const cfg = estadoConfig[pedido.estado] ?? estadoConfig.nuevo
            return (
              <div key={pedido.id} style={{ border: '1px solid #f2f2f7', borderRadius: 16, padding: '18px 20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Mesa {pedido.mesa}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                    {cfg.label}
                  </span>
                </div>
                <div style={{ marginBottom: 14 }}>
                  {pedido.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 14, color: '#6e6e73', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: '#111' }}>{item.cantidad}×</span>{' '}{item.nombre}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{Number(pedido.total).toFixed(2)}€</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(pedido.estado === 'nuevo' || pedido.estado === 'pagado') && (
                      <button onClick={() => cambiarEstado(pedido, 'preparando')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #e8e8ed', borderRadius: 10, cursor: 'pointer', background: '#fff', color: '#111', fontFamily: font }}>Preparando</button>
                    )}
                    {pedido.estado !== 'pendiente_pago' && (
                      <button onClick={() => cambiarEstado(pedido, 'listo')} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: font }}>Listo</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'carta' && (
        <div style={{ padding: '16px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            {platos.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#aeaeb2', fontSize: 14 }}>Aún no hay platos en la carta</div>}
            {platos.map(plato => (
              <div key={plato.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f2f2f7' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: plato.activo ? '#111' : '#aeaeb2', textDecoration: plato.activo ? 'none' : 'line-through', marginBottom: 2 }}>{plato.nombre}</div>
                  <div style={{ fontSize: 13, color: '#6e6e73' }}>{Number(plato.precio).toFixed(2)}€</div>
                </div>
                <button onClick={() => togglePlato(plato)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #e8e8ed', borderRadius: 10, cursor: 'pointer', background: '#fff', color: '#111', fontFamily: font, flexShrink: 0 }}>
                  {plato.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 14 }}>Añadir plato</div>
          <div key={formKey} style={{ display: 'grid', gap: 10 }}>
            {[
              { field: 'nombre', placeholder: 'Nombre' },
              { field: 'descripcion', placeholder: 'Descripción' },
              { field: 'precio', placeholder: 'Precio (ej: 12.50)' },
              { field: 'alergenos', placeholder: 'Alérgenos (ej: gluten, lácteos)' },
              { field: 'imagen_url', placeholder: 'URL de imagen (opcional)' },
            ].map(({ field, placeholder }) => (
              <input key={field} placeholder={placeholder} value={nuevoPlato[field] ?? ''} onChange={e => { const v = e.target.value; setNuevoPlato(prev => ({ ...prev, [field]: v })) }} style={{ padding: '12px 14px', borderRadius: 12, border: 'none', background: '#f5f5f7', fontSize: 14, outline: 'none', color: '#111', fontFamily: font, width: '100%', boxSizing: 'border-box' }} />
            ))}
            {errorMsg && <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>{errorMsg}</div>}
            {okMsg && <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>{okMsg}</div>}
            <button onClick={agregarPlato} disabled={guardando} style={{ padding: '14px 20px', background: guardando ? '#6e6e73' : '#111', color: '#fff', border: 'none', borderRadius: 12, cursor: guardando ? 'default' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: font, marginTop: 4 }}>
              {guardando ? 'Guardando…' : 'Añadir plato'}
            </button>
          </div>
        </div>
      )}

      {tab === 'qr' && (
        <div style={{ padding: '24px' }}>
          <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 20, lineHeight: 1.5 }}>
            Cada QR lleva al cliente directamente a la carta de <strong>{nombreRestaurante}</strong>.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <span style={{ fontSize: 14, color: '#6e6e73', fontWeight: 500 }}>Número de mesas</span>
            <input type="number" min="1" max="100" value={numMesas} onChange={e => setNumMesas(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} style={{ width: 64, padding: '8px 12px', borderRadius: 10, border: 'none', background: '#f5f5f7', fontSize: 14, outline: 'none', textAlign: 'center', fontFamily: font, color: '#111' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {Array.from({ length: numMesas }, (_, i) => i + 1).map(mesa => (
              <div key={mesa} style={{ background: '#fafafa', borderRadius: 16, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: '1px solid #f2f2f7' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', letterSpacing: 0.2 }}>Mesa {mesa}</div>
                <QRCodeCanvas id={`qr-canvas-${mesa}`} value={`${import.meta.env.VITE_APP_URL}/r/${restaurantId}?mesa=${mesa}`} size={130} level="M" marginSize={2} />
                <button onClick={() => descargarQR(mesa)} style={{ fontSize: 12, fontWeight: 600, padding: '7px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: font }}>Descargar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}