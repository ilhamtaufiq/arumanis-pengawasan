import { useEffect } from 'react'
import { sendPresenceHeartbeat } from '@/lib/presence'

const HEARTBEAT_INTERVAL_MS = 60_000

export function usePresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        await sendPresenceHeartbeat()
      } catch {
        // Best-effort presence; ignore transient failures.
      }
    }

    void ping()
    const timer = window.setInterval(() => {
      if (!cancelled) void ping()
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])
}