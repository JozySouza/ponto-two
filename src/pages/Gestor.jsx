useEffect(() => {
  loadDashboard()

  const channel = supabase
    .channel('time_records_live')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'time_records'
    }, () => loadDashboard())
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
export default function Gestor() {
  return (
    <div>
      <h1>Painel do Gestor</h1>
      <p>Em construção...</p>
    </div>
  )
}