import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('E-mail ou senha incorretos')
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f5f5f5'
    }}>
      <div style={{
        background: '#fff', padding: '40px', borderRadius: '12px',
        width: '100%', maxWidth: '360px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>Ponto Two</h1>
        <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
          Acesse sua conta
        </p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', marginBottom: '12px',
            border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px'
          }}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%', padding: '10px 12px', marginBottom: '16px',
            border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px'
          }}
        />

        {error && (
          <p style={{ color: '#e94560', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '11px', background: '#e94560',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: '500', cursor: 'pointer'
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}