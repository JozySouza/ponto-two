import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

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

export default function Gestor() {
  const { signOut } = useAuth()
  const [summary, setSummary] = useState([])
  const [requests, setRequests] = useState([])

  useEffect(() => {
    loadSummary()
    loadRequests()

    const channel = supabase
      .channel('time_records_live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'time_records'
      }, () => loadSummary())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadSummary() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('vw_daily_summary')
      .select('*')
      .eq('work_date', today)
      .order('full_name')
    setSummary(data ?? [])
  }

  async function loadRequests() {
    const { data } = await supabase
      .from('adjustment_requests')
      .select('*, users(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
  }

  async function handleRequest(id, status) {
    await supabase
      .from('adjustment_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    loadRequests()
  }

  const trabalhando = summary.filter(r => r.entry_time && !r.exit_time).length
  const ausentes = summary.filter(r => !r.entry_time).length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20 }}>Painel do Gestor</h1>
        <button onClick={signOut} style={{
          padding: '6px 14px', border: '1px solid #ddd',
          borderRadius: 8, fontSize: 13, color: '#999',
          background: 'transparent', cursor: 'pointer'
        }}>Sair</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Trabalhando agora', value: trabalhando, color: '#00B894' },
          { label: 'Ausentes hoje', value: ausentes, color: '#e94560' },
          { label: 'Ajustes pendentes', value: requests.length, color: '#FDCB6E' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f9f9f9', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>{m.label}</p>
            <p style={{ fontSize: 28, fontWeight: 500, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>
        Registros de hoje
      </h3>
      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        {summary.length === 0 && (
          <p style={{ padding: 16, color: '#999', fontSize: 13 }}>Nenhum registro hoje.</p>
        )}
        {summary.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderBottom: i < summary.length - 1 ? '1px solid #f0f0f0' : 'none',
            fontSize: 13
          }}>
            <span style={{ fontWeight: 500 }}>{r.full_name}</span>
            <span style={{ fontFamily: 'monospace', color: '#666' }}>
              {formatTime(r.entry_time)} → {formatTime(r.exit_time)}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: r.entry_time && !r.exit_time ? '#e8f8f4' : '#f0f0f0',
              color: r.entry_time && !r.exit_time ? '#00B894' : '#999'
            }}>
              {r.entry_time && !r.exit_time ? 'trabalhando' : r.exit_time ? 'encerrado' : 'ausente'}
            </span>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <>
          <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>
            Solicitações de ajuste
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map((r) => (
              <div key={r.id} style={{
                border: '1px solid #eee', borderRadius: 10,
                padding: '12px 14px', display: 'flex',
                alignItems: 'center', gap: 12, fontSize: 13
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: 2 }}>{r.users?.full_name}</p>
                  <p style={{ color: '#666', fontSize: 12 }}>
                    {formatDate(r.target_date)} — {r.reason}
                  </p>
                </div>
                <button onClick={() => handleRequest(r.id, 'approved')} style={{
                  padding: '5px 10px', background: '#e8f8f4', color: '#00B894',
                  border: '1px solid #b2dfd4', borderRadius: 6, cursor: 'pointer', fontSize: 12
                }}>Aprovar</button>
                <button onClick={() => handleRequest(r.id, 'rejected')} style={{
                  padding: '5px 10px', background: '#fef0f0', color: '#e94560',
                  border: '1px solid #f5c0c0', borderRadius: 6, cursor: 'pointer', fontSize: 12
                }}>Recusar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}