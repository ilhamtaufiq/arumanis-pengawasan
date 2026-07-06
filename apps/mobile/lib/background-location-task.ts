import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import { shouldSendPresenceLocation } from '@pengawas/shared/presence-location'
import { sendPresenceHeartbeatFromTask } from '@/lib/presence'

export const BACKGROUND_LOCATION_TASK = 'pengawas-background-location'

let lastSentAtMs: number | null = null

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations
  const latest = locations?.at(-1)
  if (!latest) {
    return
  }

  const now = Date.now()
  if (!shouldSendPresenceLocation(now, lastSentAtMs)) {
    return
  }

  lastSentAtMs = now
  const koordinat = formatKoordinat(latest.coords.latitude, latest.coords.longitude)
  await sendPresenceHeartbeatFromTask(koordinat)
})