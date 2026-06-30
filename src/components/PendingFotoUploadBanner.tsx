import { CloudOff, RefreshCcw, UploadCloud } from 'lucide-react'
import { Button, cn } from '@/components/ui'
import { useFotoUploadQueue } from '@/hooks/useFotoUploadQueue'

export function PendingFotoUploadBanner() {
  const { pendingCount, isSyncing, flushQueue } = useFotoUploadQueue()

  if (pendingCount === 0) return null

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div
      className={cn(
        'pending-upload-banner',
        offline ? 'pending-upload-banner--offline' : 'pending-upload-banner--online',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="pending-upload-banner__icon">
        {offline ? <CloudOff size={18} /> : <UploadCloud size={18} />}
      </div>
      <div className="pending-upload-banner__copy">
        <div className="pending-upload-banner__title">
          {offline
            ? `${pendingCount} foto menunggu pengiriman`
            : isSyncing
              ? 'Mengirim foto yang tertunda...'
              : `${pendingCount} foto siap dikirim`}
        </div>
        <div className="pending-upload-banner__hint">
          {offline
            ? 'Foto disimpan aman di perangkat Anda. Akan terkirim otomatis saat koneksi kembali.'
            : 'Upload gagal sebelumnya disimpan. Sistem mencoba mengirim ulang secara otomatis.'}
        </div>
      </div>
      <Button
        type="button"
        variant="neutral"
        disabled={offline || isSyncing}
        onClick={() => flushQueue()}
        className="pending-upload-banner__action"
      >
        <RefreshCcw size={16} className={isSyncing ? 'spin-slow' : undefined} />
        <span>{isSyncing ? 'Mengirim...' : 'Kirim sekarang'}</span>
      </Button>
    </div>
  )
}