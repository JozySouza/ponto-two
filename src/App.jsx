import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Colaborador from './pages/Colaborador'
import Gestor from './pages/Gestor'

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div>Carregando...</div>
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  const { user, profile } = useAuth()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            {profile?.role === 'employee'
              ? <Colaborador />
              : <Gestor />}
          </ProtectedRoute>
        } />
        <Route path="/gestor" element={
          <ProtectedRoute roles={['manager','hr','admin']}>
            <Gestor />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}