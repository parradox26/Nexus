import { useState, useEffect, useCallback } from 'react'
import { ConnectorStatus } from '../types'
import { api } from '../api/client'

export function useConnectors() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnectors = useCallback(async () => {
    try {
      setError(null)
      const data = await api.connectors.list()
      setConnectors(data.connectors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConnectors()
  }, [fetchConnectors])

  return { connectors, loading, error, refetch: fetchConnectors }
}
