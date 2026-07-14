export type OtaUpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'applying'
  | 'error'

/** Overlay apply — cukup singkat; splash native mengambil alih saat reload. */
export const OTA_APPLY_ANIMATION_MS = 700

type OtaUpdateListener = (phase: OtaUpdatePhase) => void

let currentPhase: OtaUpdatePhase = 'idle'
const listeners = new Set<OtaUpdateListener>()

export function getOtaUpdatePhase() {
  return currentPhase
}

export function setOtaUpdatePhase(phase: OtaUpdatePhase) {
  if (currentPhase === phase) return
  currentPhase = phase
  listeners.forEach((listener) => listener(phase))
}

export function subscribeOtaUpdatePhase(listener: OtaUpdateListener) {
  listeners.add(listener)
  listener(currentPhase)
  return () => {
    listeners.delete(listener)
  }
}

export function resetOtaUpdatePhase() {
  setOtaUpdatePhase('idle')
}