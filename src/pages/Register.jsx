import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
const TIPOS = ['Restaurante','Gastrobar','Cafetería','Pizzería','Hamburguesería','Sushi / Japonés','Mexicano','Italiano','Mediterráneo','Otro']

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ nombre: '', tipo: '', ciudad: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim() || !form.tipo || !form.ciudad.trim() || !form.email.trim() || !form.password) {
      setError('Rellena todos los campos.'); return
    }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const { slug } = await signUp(form.email, form.password, { nombre: form.nombre.trim(), tipo: form.tipo, ciudad: form.ciudad.trim() })
      navigate(`/admin/${slug}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.')
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '72px 32px 56px' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>Nuevo restaurante</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1, marginBottom: 10 }}>Crea tu cuenta</div>
        <div style={{ fontSize: 14, color: '#6e6e73', marginBottom: 36, lineHeight: 1.5 }}>Configura tu restaurante en menos de un minuto.</div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {[
            { label: 'NOMBRE DEL RESTAURANTE', field: 'nombre', type: 'text', placeholder: 'Ej: El Rincón de María' },
            { label: 'CIUDAD', field: 'ciudad', type: 'text', placeholder: 'Ej: Barcelona' },
            { label: 'EMAIL DEL PROPIETARIO', field: 'email', type: 'email', placeholder: 'hola@mirestaurante.com' },
            { label: 'CONTRASEÑA', field: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
            { label: 'CONFIRMAR CONTRASEÑA', field: 'confirmPassword', type: 'password', placeholder: 'Repite la contraseña' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
              <input type={type} value={form[field]} onChange={e => setField(field, e.target.value)} placeholder={placeholder} required style={inputStyle} />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, letterSpacing: 0.3 }}>TIPO DE LOCAL</label>
            <select value={form.tipo} onChange={e => setField('tipo', e.target.value)} required style={{ ...inputStyle, color: form.tipo ? '#111' : '#aeaeb2', appearance: 'none' }}>
              <option value="" disabled>Selecciona un tipo…</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '15px 20px', background: loading ? '#6e6e73' : '#111', color: '#fff', border: 'none', borderRadius: 14, cursor: loading ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, fontFamily: font }}>
            {loading ? 'Creando cuenta…' : 'Crear restaurante'}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 14, color: '#6e6e73' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#111', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</Link>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',
  background: '#f5f5f7', fontSize: 15, outline: 'none', color: '#111',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  boxSizing: 'border-box',
}