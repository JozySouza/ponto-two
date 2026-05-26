import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePunch } from '../hooks/usePunch'
import { supabase } from '../lib/supabase'

const LABELS = {
  entry: 'Registrar Entrada',
  lunch: 'Registrar Almoço',
  return: 'Registrar Retorno',
  exit: 'Registrar Saída',
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default function Colaborador() {
  const { user, profile, loading, signOut } = useAuth()
  const { punch, nextPunchType } = usePunch()
  const [nextType, setNextType] = useState(null)
  const [punching, setPunching] = useState(false)
  const [records, setRecords] = useState([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (user) {
      loadNextType()
      loadHistory()
    }
  }, [user])

  async function loadNextType() {
    const t = await nextPunchType(user.id)
    setNextType(t)
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('vw_daily_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('work_date', { ascending: false })
      .limit(20)
    setRecords(data ?? [])
  }

  async function handlePunch() {
  setPunching(true)
  const result = await punch(user.id)
  setPunching(false)
  if (result.offline) {
    showToast('Salvo offline — será sincronizado em breve')
  } else if (result.error) {
    showToast(typeof result.error === 'string' ? result.error : 'Erro ao registrar ponto')
  } else {
    showToast('Ponto registrado!')
  }
  loadNextType()
  loadHistory()
}

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) return <div style={{ padding: 20 }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{
        background: '#1A1A2E', borderRadius: 12, padding: 24,
        marginBottom: 20, color: '#fff'
      }}>
        <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>
          Olá, {profile?.full_name?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontFamily: 'monospace', fontSize: 32, marginBottom: 20 }}>
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <button
          onClick={handlePunch}
          disabled={punching || !nextType}
          style={{
            width: '100%', padding: 14, background: nextType ? '#e94560' : '#555',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 500, cursor: nextType ? 'pointer' : 'default'
          }}
        >
          {punching ? 'Registrando...' : nextType ? LABELS[nextType] : 'Turno encerrado'}
        </button>
      </div>

      <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>
        Histórico
      </h3>
      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
        {records.length === 0 && (
          <p style={{ padding: 16, color: '#999', fontSize: 13 }}>Nenhum registro ainda.</p>
        )}
        {records.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: i < records.length - 1 ? '1px solid #f0f0f0' : 'none',
            fontSize: 13
          }}>
            <span style={{ fontWeight: 500 }}>{formatDate(r.work_date)}</span>
            <span style={{ color: '#666', fontFamily: 'monospace' }}>
              {formatTime(r.entry_time)} → {formatTime(r.exit_time)}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {r.total_hours_raw ? r.total_hours_raw.toFixed(1) + 'h' : '—'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        style={{
          marginTop: 20, width: '100%', padding: 10,
          background: 'transparent', border: '1px solid #ddd',
          borderRadius: 8, fontSize: 13, color: '#999', cursor: 'pointer'
        }}
      >
        Sair
      </button>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A2E', color: '#fff', padding: '10px 20px',
          borderRadius: 100, fontSize: 13, fontWeight: 500
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}