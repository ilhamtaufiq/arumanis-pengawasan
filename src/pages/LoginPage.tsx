import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ApiError, exchangeHandoffCode, syncAuthToken } from '@/lib/api'
import { Surface } from '@/components/ui'
import {
  getHandoffCodeFromSearch,
  getMainAppSignInUrl,
  getPengawasPublicPath,
  getSsoTokenFromSearch,
  normalizeBearerToken,
  stripSsoTokenFromPath,
} from '@/lib/sso-token'

/**
 * SSO bootstrap — no local password form.
 * Entry from Arumanis: /pengawasan/login?code=... or legacy ?token=...
 * Without credentials: redirect to Arumanis /sign-in.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const handoffCode = getHandoffCodeFromSearch(location.search)
  const ssoToken = getSsoTokenFromSearch(location.search)
  const from = normalizeRedirectTarget(
    stripSsoTokenFromPath(
      (location.state as { from?: string } | null)?.from
        || searchParams.get('redirect')
        || searchParams.get('next')
        || '/',
    ),
  )
  const lastSyncedRef = useRef<string | null>(null)
  const redirectedToSignInRef = useRef(false)

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (handoffCode) {
        return exchangeHandoffCode(handoffCode)
      }

      if (!ssoToken) {
        throw new Error('Kredensial SSO tidak tersedia')
      }

      await syncAuthToken(normalizeBearerToken(ssoToken))
      return null
    },
    onSuccess: () => {
      navigate(from, { replace: true })
    },
  })

  useEffect(() => {
    if (handoffCode || ssoToken) {
      const syncKey = handoffCode || ssoToken
      if (lastSyncedRef.current === syncKey) {
        return
      }

      lastSyncedRef.current = syncKey
      syncMutation.mutate()
      return
    }

    if (redirectedToSignInRef.current) {
      return
    }

    redirectedToSignInRef.current = true
    const redirectTarget = getPengawasPublicPath(from)
    window.location.replace(getMainAppSignInUrl(redirectTarget))
  }, [from, handoffCode, ssoToken, syncMutation])

  const error =
    syncMutation.error instanceof ApiError ? syncMutation.error.message : null

  if (!handoffCode && !ssoToken) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <div className="auth-eyebrow">Arumanis</div>
          <div className="auth-title">Mengalihkan ke login Arumanis...</div>
          <div className="auth-description">
            Panel pengawasan memakai SSO. Anda akan masuk melalui aplikasi utama Arumanis.
          </div>
        </Surface>
      </div>
    )
  }

  if (syncMutation.isPending) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <div className="auth-eyebrow">Arumanis</div>
          <div className="auth-title">Menyinkronkan sesi SSO...</div>
          <div className="auth-description">Sedang menautkan sesi login dari Arumanis ke panel pengawasan.</div>
        </Surface>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-page">
        <Surface className="auth-card">
          <div className="auth-eyebrow">Arumanis</div>
          <h1 className="auth-title">Gagal menyinkronkan sesi</h1>
          <p className="auth-description">{error}</p>
          <p className="auth-description">
            Silakan masuk ulang melalui{' '}
            <a href={getMainAppSignInUrl(getPengawasPublicPath(from))}>Arumanis</a>.
          </p>
        </Surface>
      </div>
    )
  }

  return null
}

function normalizeRedirectTarget(target: string | null | undefined) {
  if (!target) {
    return '/'
  }

  if (!target.startsWith('/') || target.startsWith('//')) {
    return '/'
  }

  return target
}