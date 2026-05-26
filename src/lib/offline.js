import { openDB } from 'idb'
import { supabase } from './supabase'

async function getDB() {
  return openDB('ponto-two', 1, {
    upgrade(db) {
      db.createObjectStore('pending', {
        keyPath: 'id',
        autoIncrement: true,
      })
    },
  })
}

export async function saveOffline(record) {
  const db = await getDB()
  await db.add('pending', record)
}

export async function syncOfflineRecords() {
  const db = await getDB()
  const records = await db.getAll('pending')

  for (const record of records) {
    const { id, ...data } = record
    const { error } = await supabase
      .from('time_records')
      .insert({ ...data, is_offline_sync: true })

    if (!error) await db.delete('pending', id)
  }
}