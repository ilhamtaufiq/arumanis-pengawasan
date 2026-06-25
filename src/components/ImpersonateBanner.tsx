import { useState } from 'react'
import { AlertTriangle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { getImpersonatedUser, getImpersonatorState, stopImpersonating } from '@/lib/impersonation'

export function ImpersonateBanner() {
  const impersonator = getImpersonatorState()
  const impersonatedUser = getImpersonatedUser()
  const [isStopping, setIsStopping] = useState(false)

  if (!impersonator || !impersonatedUser) {
    return null
  }

  return (
    <div className="impersonate-banner" role="status" aria-live="polite">
      <div className="impersonate-banner__content">
        <AlertTriangle size={18} className="impersonate-banner__icon" aria-hidden="true" />
        <span>
          Anda sedang impersonasi sebagai{' '}
          <strong>{impersonatedUser.name}</strong>
          {impersonatedUser.email ? ` (${impersonatedUser.email})` : ''}
        </span>
      </div>
      <Button
        type="button"
        variant="neutral"
        size="sm"
        className="impersonate-banner__action"
        isLoading={isStopping}
        onClick={() => {
          setIsStopping(true)
          void stopImpersonating().finally(() => setIsStopping(false))
        }}
      >
        <LogOut size={16} />
        Berhenti Impersonasi
      </Button>
    </div>
  )
}