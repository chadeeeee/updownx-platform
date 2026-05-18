import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { MarketProvider } from './context/MarketContext'
import { TradingProvider } from './context/TradingContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Trading from './pages/Trading'
import Markets from './pages/Markets'
import Balance from './pages/Balance'
import Tournaments from './pages/Tournaments'
import History from './pages/History'
import Account from './pages/Account'
import PublicProfile from './pages/PublicProfile'

function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <TradingProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/trading" replace />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/u/:publicId" element={<PublicProfile />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/tournaments" element={<Tournaments />} />

            {/* Auth-only sections */}
            <Route element={<RequireAuth />}>
              <Route path="/balance" element={<Balance />} />
              <Route path="/history" element={<History />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/trading" replace />} />
        </Routes>
        </TradingProvider>
      </MarketProvider>
    </AuthProvider>
  )
}

export default App
