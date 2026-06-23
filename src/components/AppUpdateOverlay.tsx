import { RefreshCw } from 'lucide-react'
import { useAppVersionCheck } from '@/hooks/use-app-version-check'

export function AppUpdateOverlay() {
  const { isReloading } = useAppVersionCheck()

  if (!isReloading) {
    return null
  }

  return (
    <div className="app-update-overlay">
      <div className="app-update-overlay-card">
        <RefreshCw size={18} className="app-update-overlay-spin" />
        <div>
          <div className="app-update-overlay-title">Memperbarui aplikasi</div>
          <div className="app-update-overlay-copy">Versi terbaru sedang dimuat...</div>
        </div>
      </div>
    </div>
  )
}