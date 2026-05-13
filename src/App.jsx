import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Menu from './pages/Menu'
import Order from './pages/Order'
import Admin from './pages/Admin'
import Gracias from './pages/Gracias'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/menu/:restaurantId/gracias" element={<Gracias />} />
        <Route path="/menu/:restaurantId/:tableId" element={<Menu />} />
        <Route path="/order/:restaurantId/:tableId" element={<Order />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
