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
  const [aba, setAba] = useState('dashboard')
  const [funcionarios, setFuncionarios] = useState([])
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'employee' })
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')

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

  useEffect(() => {
    if (aba === 'funcionarios') loadFuncionarios()
  }, [aba])

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

  async function loadFuncionarios() {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, role, active')
      .order('full_name')
    setFuncionarios(data ?? [])
  }

  async function handleRequest(id, status) {
    await supabase
      .from('adjustment_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    loadRequests()
  }

  async function handleCadastro() {
  if (!form.full_name || !form.email || !form.password) {
    showToast('Preencha todos os campos')
    return
  }
  setSalvando(true)

  const { data, error } = await supabase.rpc('create_user_by_manager', {
    p_email: form.email,
    p_full_name: form.full_name,
    p_role: form.role,
    p_company_id: '11111111-0000-0000-0000-000000000001'
  })

  setSalvando(false)

  if (error) {
    showToast('Erro: ' + error.message)
  } else {
    showToast('Funcionário cadastrado! Senha deve ser definida pelo Supabase.')
    setForm({ full_name: '', email: '', password: '', role: 'employee' })
    loadFuncionarios()
  }
}
   
  async function toggleAtivo(id, ativo) {
    await supabase
      .from('users')
      .update({ active: !ativo })
      .eq('id', id)
    loadFuncionarios()
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f5f5f5', padding: 4, borderRadius: 8 }}>
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'funcionarios', label: 'Funcionários' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: aba === a.id ? '#fff' : 'transparent',
            color: aba === a.id ? '#1A1A2E' : '#999',
            boxShadow: aba === a.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
          }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'dashboard' && (
        <>
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
                <span style={{ fontFamily: 'monospace', color: '#666', fontSize: 11 }}>
                  {formatTime(r.entry_time)} · {formatTime(r.lunch_time)} · {formatTime(r.return_time)} · {formatTime(r.exit_time)}
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
        </>
      )}

      {aba === 'funcionarios' && (
        <>
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cadastrar novo funcionário</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input
                placeholder="Nome completo"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
              />
              <input
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
              />
              <input
                placeholder="Senha inicial"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
              />
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
              >
                <option value="employee">Colaborador</option>
                <option value="manager">Gestor</option>
                <option value="hr">RH</option>
              </select>
            </div>
            <button
              onClick={handleCadastro}
              disabled={salvando}
              style={{
                width: '100%', padding: 10, background: '#e94560',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}
            >
              {salvando ? 'Cadastrando...' : 'Cadastrar funcionário'}
            </button>
          </div>

          <h3 style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>
            Funcionários cadastrados
          </h3>
          <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
            {funcionarios.length === 0 && (
              <p style={{ padding: 16, color: '#999', fontSize: 13 }}>Nenhum funcionário cadastrado.</p>
            )}
            {funcionarios.map((f, i) => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i < funcionarios.length - 1 ? '1px solid #f0f0f0' : 'none',
                fontSize: 13
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500 }}>{f.full_name}</p>
                  <p style={{ color: '#999', fontSize: 12 }}>{f.email}</p>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 100,
                  background: f.role === 'manager' ? '#f0f0ff' : '#f0f0f0',
                  color: f.role === 'manager' ? '#6c63ff' : '#999'
                }}>
                  {f.role === 'manager' ? 'Gestor' : f.role === 'hr' ? 'RH' : 'Colaborador'}
                </span>
                <button
                  onClick={() => toggleAtivo(f.id, f.active)}
                  style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100, cursor: 'pointer',
                    background: f.active ? '#e8f8f4' : '#fef0f0',
                    color: f.active ? '#00B894' : '#e94560',
                    border: f.active ? '1px solid #b2dfd4' : '1px solid #f5c0c0'
                  }}
                >
                  {f.active ? 'ativo' : 'inativo'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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