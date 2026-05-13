import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

const platos = [
  { restaurante_id: 'gastro-gaudi', nombre: 'Patatas bravas Gaudí',                     descripcion: 'Con alioli y salsa brava especial',       precio: 6.00,  alergenos: 'ninguno',             activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Anillas de pota en tempura',                descripcion: 'Con salsa cítrica y langostino tigre',     precio: 9.50,  alergenos: 'gluten, marisco',     activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Hamburguesa vegetariana',                   descripcion: 'Con queso y verduras frescas',             precio: 10.00, alergenos: 'gluten, lácteos',     activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Focaccia artesana',                         descripcion: 'Con jamón ibérico y tomate',               precio: 8.50,  alergenos: 'gluten',              activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Huevos rotos con frankfurt y bacon ahumado', descripcion: '',                                        precio: 8.00,  alergenos: 'ninguno',             activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Mejillones al vapor con salsa de la casa',  descripcion: '',                                        precio: 7.50,  alergenos: 'marisco',             activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Bocadillo de calamares',                    descripcion: '',                                        precio: 5.50,  alergenos: 'gluten, marisco',     activo: true },
  { restaurante_id: 'gastro-gaudi', nombre: 'Croissant artesano de mantequilla',         descripcion: '',                                        precio: 2.50,  alergenos: 'gluten, lácteos',     activo: true },
]

const { data, error } = await supabase.from('platos').insert(platos).select()

if (error) {
  console.error('Error al insertar:', error.message)
  process.exit(1)
}

console.log(`✓ ${data.length} platos insertados correctamente:`)
data.forEach(p => console.log(`  - ${p.nombre} (${p.precio}€)`))
