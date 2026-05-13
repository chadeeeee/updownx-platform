import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Trading from './pages/Trading'
import Markets from './pages/Markets'
import Balance from './pages/Balance'
import Tournaments from './pages/Tournaments'
import History from './pages/History'
import Account from './pages/Account'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/trading" replace />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/history" element={<History />} />
        <Route path="/account" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/trading" replace />} />
    </Routes>
  )
}

export default App
