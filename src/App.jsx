import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Menu from './pages/Menu'
import Order from './pages/Order'
import Admin from './pages/Admin'
import Gracias from './pages/Gracias'
import Login from './pages/Login'
import Register from './pages/Register'
import Privacidad from './pages/Privacidad'
import Valorar from './pages/Valorar'
import Reservar from './pages/Reservar'

function AdminRedirect() {
  const { restaurant, authLoading } = useAuth()
  if (authLoading) return null
  if (restaurant) return <Navigate to={`/admin/${restaurant.slug}`} replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menu/:restaurantId/gracias" element={<Gracias />} />
          <Route path="/menu/:restaurantId/:tableId" element={<Menu />} />
          <Route path="/r/:restaurantId" element={<Menu />} />
          <Route path="/order/:restaurantId/:tableId" element={<Order />} />
          <Route path="/admin/:restaurantId" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/valorar/:pedidoId" element={<Valorar />} />
          <Route path="/reservar/:restaurantId" element={<Reservar />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App