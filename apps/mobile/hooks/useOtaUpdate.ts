import { useEffect, useState } from 'react'
import { applyOtaUpdateNow } from '@/lib/app-updates'
import {
  getOtaUpdatePhase,
  subscribeOtaUpdatePhase,
  type OtaUpdatePhase,
} from '@/lib/ota-update-status'

export function useOtaUpdate() {
  const [phase, setPhase] = useState<OtaUpdatePhase>(getOtaUpdatePhase)

  useEffect(() => subscribeOtaUpdatePhase(setPhase), [])

  return {
    phase,
    // Banner + overlay: semua phase aktif termasuk error pasca-reload gagal
    isVisible: phase !== 'idle',
    applyNow: () => applyOtaUpdateNow(),
  }
}