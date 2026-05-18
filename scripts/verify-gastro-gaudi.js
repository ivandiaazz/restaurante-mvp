import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

const { data, error } = await supabase
  .from('platos')
  .select('id, restaurante_id, nombre, precio, activo')
  .eq('restaurante_id', 'gastro-gaudi')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(`Platos con restaurante_id='gastro-gaudi': ${data.length}`)
data.forEach(p => console.log(`  [activo=${p.activo}] ${p.nombre} — ${p.precio}€  (id: ${p.id})`))
