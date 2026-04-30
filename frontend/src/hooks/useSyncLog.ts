import { useState, useEffect, useCallback } from 'react'
import { SyncLog } from '../types'
import { api } from '../api/client'

export function useSyncLog(limit = 10) {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setError(null)
      const data = await api.sync.logs(undefined, limit)
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}
