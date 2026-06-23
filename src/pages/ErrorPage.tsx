import { Link } from 'react-router-dom'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button, Surface } from '@/components/ui'
import { hardReloadApp } from '@/lib/app-cache'

export function ErrorPage() {
  return (
    <div className="auth-page">
      <Surface className="auth-card error-page-card">
        <div className="error-page-icon error-page-icon--danger">
          <AlertTriangle size={28} />
        </div>
        <div className="error-page-code">500</div>
        <div className="empty-state-title">Terjadi kesalahan</div>
        <div className="empty-state-description">
          Aplikasi mengalami gangguan sementara. Coba muat ulang halaman atau kembali ke dashboard.
        </div>
        <div className="error-page-actions">
          <Button type="button" onClick={() => void hardReloadApp()}>
            <RefreshCw size={16} />
            <span>Bersihkan cache & muat ulang</span>
          </Button>
          <Link className="neo-button neo-button--neutral" to="/">
            <Home size={16} />
            <span>Ke dashboard</span>
          </Link>
        </div>
      </Surface>
    </div>
  )
}