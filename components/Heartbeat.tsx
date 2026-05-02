'use client'

import { useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export function Heartbeat() {
  useEffect(() => {
    const ping = () => fetch(`${API_BASE}/api/health`, { method: 'GET' }).catch(() => {})
    ping()
    const id = setInterval(ping, 29_000)
    return () => clearInterval(id)
  }, [])

  return null
}
