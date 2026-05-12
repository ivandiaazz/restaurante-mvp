import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

const RESTAURANTE_ID = 'restaurante1'

export default function Admin() {
  const [pedidos, setPedidos] = useState([])
  const [platos, setPlatos] = useState([])
  const [nuevoPlato, setNuevoPlato] = useState({ nombre: '', descripcion: '', precio: '', alergenos: '' })

  useEffect(() => {
    fetchPedidos()
    fetchPlatos()
    const sub = supabase.channel('pedidos').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
      setPedidos(prev => [payload.new, ...prev])
    }).subscribe()
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
    await supabase.from('platos').insert({ ...nuevoPlato, precio: parseFloat(nuevoPlato.precio), restaurante_id: RESTAURANTE_ID, activo: true })
    setNuevoPlato({ nombre: '', descripcion: '', precio: '', alergenos: '' })
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

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>Panel de administración</h1>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Pedidos en curso</h2>
      {pedidos.filter(p => p.estado !== 'listo').map(pedido => (
        <div key={pedido.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Mesa {pedido.mesa}</span>
            <span style={{ fontSize: 13, color: pedido.estado === 'nuevo' ? '#f59e0b' : '#3b82f6' }}>{pedido.estado}</span>
          </div>
          {pedido.items.map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: '#555' }}>{item.cantidad}× {item.nombre}</div>
          ))}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => cambiarEstado(pedido, 'preparando')} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>Preparando</button>
            <button onClick={() => cambiarEstado(pedido, 'listo')} style={{ padding: '4px 10px', fontSize: 12, background: '#000', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Listo</button>
          </div>
        </div>
      ))}

      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>Carta</h2>
      {platos.map(plato => (
        <div key={plato.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
          <span style={{ textDecoration: plato.activo ? 'none' : 'line-through', color: plato.activo ? '#000' : '#999' }}>{plato.nombre} — {plato.precio}€</span>
          <button onClick={() => togglePlato(plato)} style={{ padding: '3px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{plato.activo ? 'Desactivar' : 'Activar'}</button>
        </div>
      ))}

      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>Añadir plato</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Nombre" value={nuevoPlato.nombre} onChange={e => setNuevoPlato({ ...nuevoPlato, nombre: e.target.value })} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
        <input placeholder="Descripción" value={nuevoPlato.descripcion} onChange={e => setNuevoPlato({ ...nuevoPlato, descripcion: e.target.value })} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
        <input placeholder="Precio (ej: 12.50)" value={nuevoPlato.precio} onChange={e => setNuevoPlato({ ...nuevoPlato, precio: e.target.value })} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
        <input placeholder="Alérgenos (ej: gluten, lácteos)" value={nuevoPlato.alergenos} onChange={e => setNuevoPlato({ ...nuevoPlato, alergenos: e.target.value })} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
        <button onClick={agregarPlato} style={{ padding: 10, background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Añadir plato</button>
      </div>
    </div>
  )
}