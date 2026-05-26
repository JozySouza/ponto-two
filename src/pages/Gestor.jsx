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