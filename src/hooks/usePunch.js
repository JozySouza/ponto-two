import { supabase } from '../lib/supabase'
import { saveOffline, syncOfflineRecords } from '../lib/offline'

const SEQUENCE = ['entry', 'lunch', 'return', 'exit']

export function usePunch() {
  async function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 3000 }
      )
    })
  }

  async function nextPunchType(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('time_records')
      .select('punch_type')
      .eq('user_id', userId)
      .gte('punched_at', today + 'T00:00:00Z')
      .order('punched_at', { ascending: false })

    const done = data?.map(r => r.punch_type) ?? []
    return SEQUENCE.find(t => !done.includes(t)) ?? null
  }

  async function punch(userId) {
    const punchType = await nextPunchType(userId)
    if (!punchType) return { error: 'Turno já encerrado' }

    const location = await getLocation()
    const record = {
      user_id: userId,
      punch_type: punchType,
      punched_at: new Date().toISOString(),
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      is_offline_sync: false,
    }

    if (!navigator.onLine) {
      await saveOffline({ ...record, is_offline_sync: true })
      return { data: record, offline: true }
    }

    const { data, error } = await supabase
      .from('time_records')
      .insert(record)
      .select()
      .single()

    return { data, error }
  }

  window.addEventListener('online', () => syncOfflineRecords())

  return { punch, nextPunchType }
}