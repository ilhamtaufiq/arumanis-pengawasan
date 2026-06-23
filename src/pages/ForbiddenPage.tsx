import { Link } from 'react-router-dom'
import { Home, ShieldAlert } from 'lucide-react'
import { Surface } from '@/components/ui'

export function ForbiddenPage() {
  return (
    <div className="auth-page">
      <Surface className="auth-card error-page-card">
        <div className="error-page-icon error-page-icon--warn">
          <ShieldAlert size={28} />
        </div>
        <div className="error-page-code">403</div>
        <div className="empty-state-title">Akses ditolak</div>
        <div className="empty-state-description">
          Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika diperlukan.
        </div>
        <div className="error-page-actions">
          <Link className="neo-button" to="/">
            <Home size={16} />
            <span>Ke dashboard</span>
          </Link>
        </div>
      </Surface>
    </div>
  )
}