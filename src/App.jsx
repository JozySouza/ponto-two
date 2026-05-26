import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Colaborador from './pages/Colaborador'
import Gestor from './pages/Gestor'

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{ padding: 20 }}>Carregando...</div>
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" />
  return children
}

function HomeRoute() {
  const { profile, loading } = useAuth()
  console.log('profile:', profile)
  console.log('loading:', loading)
  if (loading) return <div style={{ padding: 20 }}>Carregando...</div>
  if (profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') {
    return <Navigate to="/gestor" />
  }
  return <Colaborador />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <HomeRoute />
          </ProtectedRoute>
        } />
        <Route path="/gestor" element={
          <ProtectedRoute roles={['manager', 'hr', 'admin']}>
            <Gestor />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}