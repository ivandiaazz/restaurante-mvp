import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

const RESTAURANTE_ID = 'restaurante1'

const estadoConfig = {
  nuevo:      { label: 'Nuevo',      dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  preparando: { label: 'Preparando', dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  listo:      { label: 'Listo',      dot: '#22c55e', bg: '#f0fdf4', text: '#166534' },
}

export default function Admin() {
  const [tab, setTab] = useState('pedidos')
  const [pedidos, setPedidos] = useState([])
  const [platos, setPlatos] = useState([])
  const [nuevoPlato, setNuevoPlato] = useState({ nombre: '', descripcion: '', precio: '', alergenos: '', imagen_url: '' })
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchPedidos()
    fetchPlatos()
    const sub = supabase.channel('pedidos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
        setPedidos(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchPedidos() {
    const { data } = await supabase.from('pedidos').select('*').eq('restaurante_id', RESTAURANTE_ID).order('created_at', { ascending: false })
    if (data) setPedidos(data)
  }

  async function fetchPlatos() {
    const { data } = await supabase.from('platos').select('*').eq('restaurante_id', RESTAURANTE_ID)
    if (data) setPlatos(data)
  }

  async function agregarPlato() {
    if (!nuevoPlato.nombre || !nuevoPlato.precio) return
    setGuardando(true)
    setErrorMsg('')
    const payload = {
      nombre: nuevoPlato.nombre,
      descripcion: nuevoPlato.descripcion,
      precio: parseFloat(nuevoPlato.precio),
      alergenos: nuevoPlato.alergenos,
      restaurante_id: RESTAURANTE_ID,
      activo: true
    }
    if (nuevoPlato.imagen_url) payload.imagen_url = nuevoPlato.imagen_url
    const { data, error } = await supabase.from('platos').insert(payload).select()
    setGuardando(false)
    if (error) {
      setErrorMsg('Error: ' + error.message)
      return
    }
    if (!data || data.length === 0) {
      setErrorMsg('El plato no se guardó. Revisa los permisos de la tabla en Supabase (RLS).')
      return
    }
    setNuevoPlato({ nombre: '', descripcion: '', precio: '', alergenos: '', imagen_url: '' })
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

  const pedidosActivos = pedidos.filter(p => p.estado !== 'listo')
  const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

  return (
    <div style={{ fontFamily: font, maxWidth: 600, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 0', borderBottom: '1px solid #f2f2f7' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>
          Restaurante
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1, marginBottom: 24 }}>
          Admin
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {['pedidos', 'carta'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px 12px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: font,
                color: tab === t ? '#111' : '#aeaeb2',
                borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                textTransform: 'capitalize', letterSpacing: 0.2,
                transition: 'color 0.15s'
              }}
            >
              {t === 'pedidos' ? `Pedidos${pedidosActivos.length ? ` (${pedidosActivos.length})` : ''}` : 'Carta'}
            </button>
          ))}
        </div>
      </div>

      {/* Pedidos */}
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
              <div key={pedido.id} style={{
                border: '1px solid #f2f2f7', borderRadius: 16,
                padding: '18px 20px', marginBottom: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Mesa {pedido.mesa}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 20, background: cfg.bg, color: cfg.text,
                    display: 'flex', alignItems: 'center', gap: 5
                  }}>
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                    {Number(pedido.total).toFixed(2)}€
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {pedido.estado === 'nuevo' && (
                      <button
                        onClick={() => cambiarEstado(pedido, 'preparando')}
                        style={{
                          padding: '7px 14px', fontSize: 12, fontWeight: 600,
                          border: '1px solid #e8e8ed', borderRadius: 10,
                          cursor: 'pointer', background: '#fff', color: '#111',
                          fontFamily: font
                        }}
                      >Preparando</button>
                    )}
                    <button
                      onClick={() => cambiarEstado(pedido, 'listo')}
                      style={{
                        padding: '7px 14px', fontSize: 12, fontWeight: 600,
                        background: '#111', color: '#fff', border: 'none',
                        borderRadius: 10, cursor: 'pointer', fontFamily: font
                      }}
                    >Listo</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Carta */}
      {tab === 'carta' && (
        <div style={{ padding: '16px 24px' }}>
          {/* Lista de platos */}
          <div style={{ marginBottom: 32 }}>
            {platos.map(plato => (
              <div key={plato.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: '1px solid #f2f2f7'
              }}>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 600,
                    color: plato.activo ? '#111' : '#aeaeb2',
                    textDecoration: plato.activo ? 'none' : 'line-through',
                    marginBottom: 2
                  }}>
                    {plato.nombre}
                  </div>
                  <div style={{ fontSize: 13, color: '#6e6e73' }}>{Number(plato.precio).toFixed(2)}€</div>
                </div>
                <button
                  onClick={() => togglePlato(plato)}
                  style={{
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    border: '1px solid #e8e8ed', borderRadius: 10,
                    cursor: 'pointer', background: '#fff', color: '#111',
                    fontFamily: font, flexShrink: 0
                  }}
                >
                  {plato.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>

          {/* Añadir plato */}
          <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aeaeb2', fontWeight: 600, marginBottom: 14 }}>
            Añadir plato
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { key: 'nombre', placeholder: 'Nombre' },
              { key: 'descripcion', placeholder: 'Descripción' },
              { key: 'precio', placeholder: 'Precio (ej: 12.50)' },
              { key: 'alergenos', placeholder: 'Alérgenos (ej: gluten, lácteos)' },
              { key: 'imagen_url', placeholder: 'URL de imagen (opcional)' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                placeholder={placeholder}
                value={nuevoPlato[key]}
                onChange={e => { const v = e.target.value; setNuevoPlato(prev => ({ ...prev, [key]: v })) }}
                style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: 'none', background: '#f5f5f7',
                  fontSize: 14, outline: 'none', color: '#111',
                  fontFamily: font, width: '100%', boxSizing: 'border-box'
                }}
              />
            ))}
            {errorMsg && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>
                {errorMsg}
              </div>
            )}
            <button
              onClick={agregarPlato}
              disabled={guardando}
              style={{
                padding: '14px 20px', background: guardando ? '#6e6e73' : '#111', color: '#fff',
                border: 'none', borderRadius: 12, cursor: guardando ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: font,
                marginTop: 4
              }}
            >
              {guardando ? 'Guardando...' : 'Añadir plato'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
