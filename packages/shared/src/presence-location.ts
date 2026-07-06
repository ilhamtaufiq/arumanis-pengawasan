export const PRESENCE_LOCATION_MIN_INTERVAL_MS = 60_000

export function shouldSendPresenceLocation(nowMs: number, lastSentAtMs: number | null): boolean {
  if (lastSentAtMs == null) {
    return true
  }

  return nowMs - lastSentAtMs >= PRESENCE_LOCATION_MIN_INTERVAL_MS
}