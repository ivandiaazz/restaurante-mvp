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
  const [periodoAnalytics, setPeriodoAnalytics] = useState('semana')
  const [valoraciones, setValoraciones] = useState([])
  const [promociones, setPromociones] = useState([])
  const [nuevaPromo, setNuevaPromo] = useState({ nombre: '', descripcion: '', precio: '', solo_hoy: false, fecha_inicio: '', fecha_fin: '' })
  const [guardandoPromo, setGuardandoPromo] = useState(false)
  const [formPromoKey, setFormPromoKey] = useState(0)
  const [mostrarFormPromo, setMostrarFormPromo] = useState(false)

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
    fetchValoraciones()
    fetchPromociones()
    registrarPush()

    const MAX_RETRIES = 5
    let retries = 0
    let retryTimer = null
    let activeChannel = null

    function conectar() {
      // Unique name per attempt so Supabase doesn't reuse a closed channel object
      activeChannel = supabase
        .channel(`admin-pedidos-${restaurantId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pedidos' },
          payload => {
            if (payload.new?.restaurante_id !== restaurantId) {
              console.log('[realtime] INSERT ignorado — restaurante_id recibido:', payload.new?.restaurante_id, '!= esperado:', restaurantId)
              return
            }
            console.log('[realtime] INSERT pedido mesa:', payload.new.mesa, 'estado:', payload.new.estado)
            setPedidos(prev => [payload.new, ...prev])
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pedidos' },
          payload => {
            if (payload.new?.restaurante_id !== restaurantId) {
              console.log('[realtime] UPDATE ignorado — restaurante_id recibido:', payload.new?.restaurante_id, '!= esperado:', restaurantId)
              return
            }
            console.log('[realtime] UPDATE pedido mesa:', payload.new.mesa, 'estado:', payload.new.estado)
            setPedidos(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            retries = 0
            console.log('[realtime] canal SUBSCRIBED ✓ — escuchando pedidos de', restaurantId)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[realtime] canal FALLO — estado:', status, err?.message ?? '(sin detalle)')
            if (retries < MAX_RETRIES) {
              retries++
              console.log(`[realtime] reintentando en 3s (intento ${retries}/${MAX_RETRIES})…`)
              retryTimer = setTimeout(() => {
                supabase.removeChannel(activeChannel)
                conectar()
              }, 3000)
            } else {
              console.error('[realtime] máximo de reintentos (5) alcanzado — sin reconexión')
            }
          } else {
            console.log('[realtime] canal status:', status)
          }
        })
    }

    conectar()

    return () => {
      clearTimeout(retryTimer)
      if (activeChannel) supabase.removeChannel(activeChannel)
    }
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

  async function fetchValoraciones() {
    const { data } = await supabase
      .from('valoraciones')
      .select('puntuacion')
      .eq('restaurante_id', restaurantId)
    if (data) setValoraciones(data)
  }

  async function fetchPromociones() {
    const { data } = await supabase
      .from('promociones')
      .select('*')
      .eq('restaurante_id', restaurantId)
      .order('created_at', { ascending: false })
    if (data) setPromociones(data)
  }

  async function agregarPromocion() {
    setErrorMsg('')
    setOkMsg('')
    const nombre = nuevaPromo.nombre?.trim()
    const precio = nuevaPromo.precio?.toString().trim()
    if (!nombre || !precio) { setErrorMsg('Nombre y precio son obligatorios.'); return }
    setGuardandoPromo(true)
    const payload = {
      nombre,
      descripcion: nuevaPromo.descripcion?.trim() ?? '',
      precio: parseFloat(precio),
      solo_hoy: nuevaPromo.solo_hoy,
      fecha_inicio: (!nuevaPromo.solo_hoy && nuevaPromo.fecha_inicio) ? nuevaPromo.fecha_inicio : null,
      fecha_fin: (!nuevaPromo.solo_hoy && nuevaPromo.fecha_fin) ? nuevaPromo.fecha_fin : null,
      restaurante_id: restaurantId,
      activo: true,
    }
    const { error } = await supabase.from('promociones').insert(payload)
    setGuardandoPromo(false)
    if (error) { setErrorMsg(`Error: ${error.message}`); return }
    setOkMsg(`"${nombre}" añadida como promoción.`)
    setNuevaPromo({ nombre: '', descripcion: '', precio: '', solo_hoy: false, fecha_inicio: '', fecha_fin: '' })
    setFormPromoKey(k => k + 1)
    setMostrarFormPromo(false)
    fetchPromociones()
  }

  async function togglePromocion(promo) {
    await supabase.from('promociones').update({ activo: !promo.activo }).eq('id', promo.id)
    fetchPromociones()
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

  // ── Analytics ────────────────────────────────────────────────────────────────
  const ESTADOS_VALIDOS = ['pagado', 'preparando', 'listo', 'nuevo']

  function getPeriodStart(periodo) {
    const now = new Date()
    if (periodo === 'hoy') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (periodo === 'semana') {
      const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d
    }
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const pedidosValidos = pedidos.filter(p => ESTADOS_VALIDOS.includes(p.estado))
  const pedidosPeriodo = pedidosValidos.filter(p => new Date(p.created_at) >= getPeriodStart(periodoAnalytics))

  const ingresosTotal = pedidosPeriodo.reduce((s, p) => s + Number(p.total || 0), 0)
  const ticketMedio = pedidosPeriodo.length ? ingresosTotal / pedidosPeriodo.length : 0

  const hoyStart = new Date(); hoyStart.setHours(0, 0, 0, 0)
  const pedidosHoyCount = pedidosValidos.filter(p => new Date(p.created_at) >= hoyStart).length

  const mesaCounter = {}
  pedidosPeriodo.forEach(p => { mesaCounter[p.mesa] = (mesaCounter[p.mesa] || 0) + 1 })
  const mesaMasActiva = Object.entries(mesaCounter).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const platoCounter = {}
  pedidosPeriodo.forEach(p => {
    ;(p.items || []).forEach(item => {
      if (item?.nombre) platoCounter[item.nombre] = (platoCounter[item.nombre] || 0) + (item.cantidad || 1)
    })
  })
  const topPlatos = Object.entries(platoCounter).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxPlato = topPlatos[0]?.[1] || 1

  // Ingresos por día — últimos 7 días (fijo, independiente del período)
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0); return d
  })
  const ingresosDia = dias7.map(d => {
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const total = pedidosValidos
      .filter(p => { const pd = new Date(p.created_at); return pd >= d && pd < next })
      .reduce((s, p) => s + Number(p.total || 0), 0)
    return { label: d.toLocaleDateString('es-ES', { weekday: 'short' }), day: d.getDate(), total }
  })
  const maxDia = Math.max(...ingresosDia.map(d => d.total), 1)

  // Horas pico — filtrado por período, horas 8-23
  const horaCounter = {}
  pedidosPeriodo.forEach(p => {
    const h = new Date(p.created_at).getHours()
    horaCounter[h] = (horaCounter[h] || 0) + 1
  })
  const horasPico = Array.from({ length: 16 }, (_, i) => ({
    label: `${i + 8}h`,
    count: horaCounter[i + 8] || 0,
  }))
  const maxHora = Math.max(...horasPico.map(h => h.count), 1)

  const BAR_H = 80 // max bar height px
  const barPx = (val, max) => val > 0 ? Math.max(Math.round((val / max) * BAR_H), 4) : 0

  const valoracionMedia = valoraciones.length
    ? valoraciones.reduce((s, v) => s + v.puntuacion, 0) / valoraciones.length
    : null

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

        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {['pedidos', 'carta', 'qr', 'analytics'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px 12px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: font,
                color: tab === t ? '#111' : '#aeaeb2',
                borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                letterSpacing: 0.2, transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t === 'pedidos'
                ? `Pedidos${pedidosActivos.length ? ` (${pedidosActivos.length})` : ''}`
                : t === 'carta' ? 'Carta'
                : t === 'qr' ? 'QR Mesas'
                : 'Analytics'}
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

          {/* Promociones */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600 }}>Promociones</div>
              <button
                onClick={() => { setMostrarFormPromo(!mostrarFormPromo); setErrorMsg(''); setOkMsg('') }}
                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #e8e8ed', borderRadius: 10, cursor: 'pointer', background: mostrarFormPromo ? '#111' : '#fff', color: mostrarFormPromo ? '#fff' : '#111', fontFamily: font }}
              >
                {mostrarFormPromo ? 'Cancelar' : '+ Añadir'}
              </button>
            </div>

            {mostrarFormPromo && (
              <div key={formPromoKey} style={{ background: '#fafafa', borderRadius: 14, padding: '16px', marginBottom: 14, display: 'grid', gap: 10 }}>
                {[
                  { field: 'nombre', placeholder: 'Nombre de la promoción' },
                  { field: 'descripcion', placeholder: 'Descripción (opcional)' },
                  { field: 'precio', placeholder: 'Precio (ej: 9.90)' },
                ].map(({ field, placeholder }) => (
                  <input key={field} placeholder={placeholder} value={nuevaPromo[field] ?? ''} onChange={e => { const v = e.target.value; setNuevaPromo(prev => ({ ...prev, [field]: v })) }} style={{ padding: '11px 14px', borderRadius: 10, border: 'none', background: '#fff', fontSize: 14, outline: 'none', color: '#111', fontFamily: font, width: '100%', boxSizing: 'border-box', boxShadow: '0 0 0 1px #e8e8ed' }} />
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#111', cursor: 'pointer', padding: '4px 0' }}>
                  <input type="checkbox" checked={nuevaPromo.solo_hoy} onChange={e => setNuevaPromo(prev => ({ ...prev, solo_hoy: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#111', cursor: 'pointer' }} />
                  Solo hoy (Menú del día)
                </label>
                {!nuevaPromo.solo_hoy && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4, letterSpacing: 0.5 }}>Desde</div>
                      <input type="date" value={nuevaPromo.fecha_inicio} onChange={e => setNuevaPromo(prev => ({ ...prev, fecha_inicio: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#fff', fontSize: 13, outline: 'none', color: '#111', fontFamily: font, width: '100%', boxSizing: 'border-box', boxShadow: '0 0 0 1px #e8e8ed' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4, letterSpacing: 0.5 }}>Hasta</div>
                      <input type="date" value={nuevaPromo.fecha_fin} onChange={e => setNuevaPromo(prev => ({ ...prev, fecha_fin: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#fff', fontSize: 13, outline: 'none', color: '#111', fontFamily: font, width: '100%', boxSizing: 'border-box', boxShadow: '0 0 0 1px #e8e8ed' }} />
                    </div>
                  </div>
                )}
                {errorMsg && <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>{errorMsg}</div>}
                {okMsg && <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>{okMsg}</div>}
                <button onClick={agregarPromocion} disabled={guardandoPromo} style={{ padding: '13px 20px', background: guardandoPromo ? '#6e6e73' : '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: guardandoPromo ? 'default' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: font }}>
                  {guardandoPromo ? 'Guardando…' : 'Crear promoción'}
                </button>
              </div>
            )}

            {promociones.length === 0 && !mostrarFormPromo ? (
              <div style={{ fontSize: 13, color: '#aeaeb2', textAlign: 'center', padding: '16px 0' }}>Sin promociones activas</div>
            ) : promociones.map(promo => {
              const badge = promo.solo_hoy ? 'Menú del día' : (promo.fecha_inicio || promo.fecha_fin) ? `${promo.fecha_inicio ?? ''}${promo.fecha_fin ? ` → ${promo.fecha_fin}` : ''}` : 'Oferta'
              return (
                <div key={promo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f2f2f7' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: promo.activo ? '#fffbeb' : '#f5f5f7', color: promo.activo ? '#92400e' : '#aeaeb2', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.6, textTransform: 'uppercase', flexShrink: 0 }}>{badge}</span>
                      <div style={{ fontSize: 15, fontWeight: 600, color: promo.activo ? '#111' : '#aeaeb2', textDecoration: promo.activo ? 'none' : 'line-through' }}>{promo.nombre}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6e6e73' }}>{Number(promo.precio).toFixed(2)}€</div>
                  </div>
                  <button onClick={() => togglePromocion(promo)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1px solid #e8e8ed', borderRadius: 10, cursor: 'pointer', background: '#fff', color: '#111', fontFamily: font, flexShrink: 0, marginLeft: 12 }}>
                    {promo.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ height: 1, background: '#f2f2f7', marginBottom: 24 }} />

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

      {tab === 'analytics' && (
        <div style={{ padding: '16px 24px 40px' }}>

          {/* Filtro de período */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodoAnalytics(p.id)}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: font,
                  borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: periodoAnalytics === p.id ? '#111' : '#f5f5f7',
                  color: periodoAnalytics === p.id ? '#fff' : '#6e6e73',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Valoración media */}
          {valoracionMedia !== null && (
            <div style={{ border: '1px solid #f2f2f7', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 8 }}>Valoración media</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>{valoracionMedia.toFixed(1)}</span>
                <span style={{ fontSize: 20, letterSpacing: 1, color: '#f59e0b' }}>
                  {'★'.repeat(Math.round(valoracionMedia))}
                  <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - Math.round(valoracionMedia))}</span>
                </span>
                <span style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 500 }}>
                  {valoraciones.length} valoración{valoraciones.length !== 1 ? 'es' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Cards de resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
            {[
              { label: 'Ingresos', value: `${ingresosTotal.toFixed(2)}€` },
              { label: 'Pedidos hoy', value: String(pedidosHoyCount) },
              { label: 'Ticket medio', value: pedidosPeriodo.length ? `${ticketMedio.toFixed(2)}€` : '—' },
              { label: 'Mesa top', value: mesaMasActiva ? `Mesa ${mesaMasActiva}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ border: '1px solid #f2f2f7', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Platos más pedidos */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 14 }}>Platos más pedidos</div>
            {topPlatos.length === 0 ? (
              <div style={{ fontSize: 14, color: '#aeaeb2', textAlign: 'center', padding: '20px 0' }}>Sin datos en este período</div>
            ) : topPlatos.map(([nombre, count], i) => (
              <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d1d1d6', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{nombre}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{count}×</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: '#f2f2f7' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: '#111', width: `${Math.round(count / maxPlato * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ingresos por día — últimos 7 días */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 16 }}>Ingresos · últimos 7 días</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              {ingresosDia.map(({ label, day, total }) => (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 500, height: 14, display: 'flex', alignItems: 'flex-end', marginBottom: 3 }}>
                    {total > 0 ? `${total.toFixed(0)}€` : ''}
                  </div>
                  <div style={{ width: '100%', height: BAR_H, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', background: total > 0 ? '#111' : '#f2f2f7', borderRadius: '3px 3px 0 0', height: barPx(total, maxDia) }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#aeaeb2', textAlign: 'center', marginTop: 4, lineHeight: 1.3 }}>
                    {label}<br />{day}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Horas pico */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 16 }}>Horas pico</div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', minWidth: 340 }}>
                {horasPico.map(({ label, count }) => (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: BAR_H, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', background: count > 0 ? '#111' : '#f2f2f7', borderRadius: '3px 3px 0 0', height: barPx(count, maxHora) }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#aeaeb2', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
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