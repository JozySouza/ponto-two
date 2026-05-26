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

export default function Colaborador() {
  const { user, profile, signOut } = useAuth()
  const { punch, nextPunchType } = usePunch(user?.id)
  const [nextType, setNextType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState([])

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
      .limit(30)
    setRecords(data ?? [])
  }

  async function handlePunch() {
    setLoading(true)
    const result = await punch(user.id)
    setLoading(false)
    if (result.offline) alert('Salvo offline — será sincronizado em breve')
    loadNextType()
    loadHistory()
  }

  return (
    <div>
      <h1>Olá, {profile?.full_name}</h1>
      <button onClick={handlePunch} disabled={loading || !nextType}>
        {loading ? 'Registrando...' : (nextType ? LABELS[nextType] : 'Turno encerrado')}
      </button>
      {/* Renderiza records aqui com sua UI */}
      <button onClick={signOut}>Sair</button>
    </div>
  )
}
export default function Colaborador() {
  return (
    <div>
      <h1>Colaborador</h1>
    </div>
  )
}