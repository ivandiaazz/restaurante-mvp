import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, session, restaurant, authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && session && restaurant) {
      navigate(`/admin/${restaurant.slug}`, { replace: true })
    }
  }, [session, restaurant, authLoading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Email o contraseña incorrectos.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Cargando…
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
      <div style={{ padding: '72px 32px 40px' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#aeaeb2', marginBottom: 8, fontWeight: 500 }}>
          Panel de administración
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111', letterSpacing: -1.5, lineHeight: 1, marginBottom: 40 }}>
          Iniciar sesión
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, letterSpacing: 0.3 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hola@mirestaurante.com" required autoComplete="email" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, letterSpacing: 0.3 }}>CONTRASEÑA</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={inputStyle} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '15px 20px', background: loading ? '#6e6e73' : '#111', color: '#fff', border: 'none', borderRadius: 14, cursor: loading ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, fontFamily: font }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 14, color: '#6e6e73' }}>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" style={{ color: '#111', fontWeight: 600, textDecoration: 'none' }}>Registra tu restaurante</Link>
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