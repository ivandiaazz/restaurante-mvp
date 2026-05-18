import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function ProtectedRoute({ children }) {
  const { session, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div style={{
        fontFamily: font,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#fff', color: '#aeaeb2', fontSize: 15
      }}>
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}