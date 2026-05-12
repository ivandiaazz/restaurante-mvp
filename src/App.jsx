import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Menu from './pages/Menu'
import Order from './pages/Order'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/menu/:restaurantId/:tableId" element={<Menu />} />
        <Route path="/order/:restaurantId/:tableId" element={<Order />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
