export type OtaAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension'

export const OTA_CHECK_DELAY_MS = 2_500

let pendingOtaReload = false

export function shouldDeferOtaReload(appState: OtaAppState) {
  return appState === 'active'
}

export function markOtaReloadPending() {
  pendingOtaReload = true
}

export function consumeOtaReloadPending() {
  const pending = pendingOtaReload
  pendingOtaReload = false
  return pending
}

export function isOtaReloadPending() {
  return pendingOtaReload
}

export function resetOtaReloadPending() {
  pendingOtaReload = false
}