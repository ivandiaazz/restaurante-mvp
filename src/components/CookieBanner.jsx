import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'mqr_cookies'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: '#1a1a1a', borderTop: '1px solid rgba(201,164,101,0.18)',
      padding: '14px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    }}>
      <span style={{ fontSize: 13, color: '#c8c4bc', lineHeight: 1.5, flex: 1, minWidth: 200 }}>
        Usamos cookies para mejorar tu experiencia. Al continuar navegando aceptas nuestra{' '}
        <Link to="/privacidad" style={{ color: '#c9a465', textDecoration: 'none' }}>
          política de privacidad
        </Link>.
      </span>
      <button
        onClick={accept}
        style={{
          padding: '9px 22px', background: '#c9a465', color: '#0f0f0f',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}
      >
        Aceptar
      </button>
    </div>
  )
}
