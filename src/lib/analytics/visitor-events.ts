import { getUmamiConfig, isUmamiEnabled, loadUmamiScript, trackUmamiEvent } from './umami'

export type PengawasVisitorEventName =
  | 'pekerjaan_view'
  | 'laporan_submit'
  | 'laporan_import_nego'
  | 'laporan_autofill_rencana'
  | 'laporan_export'
  | 'foto_upload'

export type PengawasVisitorEventPayload = Record<string, string | number | boolean>

export async function trackPengawasEvent(
  name: PengawasVisitorEventName,
  payload: PengawasVisitorEventPayload = {},
): Promise<void> {
  if (!isUmamiEnabled()) {
    return
  }

  const config = getUmamiConfig()
  if (!config) {
    return
  }

  try {
    await loadUmamiScript(config)
    trackUmamiEvent(name, {
      ...payload,
      app: 'pengawasan',
    })
  } catch {
    // Analytics must not break the app
  }
}