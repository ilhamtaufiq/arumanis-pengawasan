import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ApiError, exchangeHandoffCode, me, syncAuthToken, unwrapEntity } from '@/lib/api'
import type { AuthUser } from '@pengawas/shared'
import { Button, Surface } from '@/components/ui'
import {
  getHandoffCodeFromSearch,
  getMainAppSignInUrl,
  getPengawasPublicPath,
  getSsoTokenFromSearch,
  normalizeBearerToken,
  resolveLoginRedirectTarget,
  stripSsoTokenFromPath,
} from '@/lib/sso-token'

/**
 * SSO bootstrap — no local password form.
 * Entry from Arumanis: /pengawasan/login?code=... or legacy ?token=...
 * Without credentials: redirect to Arumanis /sign-in.
 */
export function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const handoffCode = getHandoffCodeFromSearch(location.search)
  const ssoToken = getSsoTokenFromSearch(location.search)
  const from = resolveLoginRedirectTarget(
    stripSsoTokenFromPath(
      (location.state as { from?: string } | null)?.from
        || searchParams.get('redirect')
        || searchParams.get('next')
        || '/',
    ),
  )
  const lastSyncedRef = useRef<string | null>(null)
  const redirectedToSignInRef = useRef(false)
  const [selfRedirectBlocked, setSelfRedirectBlocked] = useState(false)

  // Sesi yang mungkin sudah ada (cookie masih valid). Dicek dulu supaya
  // tidak menukar kode sekali pakai padahal sebenarnya sudah login.
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
    retry: false,
    staleTime: 0,
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (handoffCode) {
        return exchangeHandoffCode(handoffCode)
      }

      if (!ssoToken) {
        throw new Error('Kredensial SSO tidak tersedia')
      }

      const payload = await syncAuthToken(normalizeBearerToken(ssoToken))
      return unwrapEntity<AuthUser>(payload)
    },
    onSuccess: (result) => {
      // Prime cache sesi supaya ProtectedRoute langsung render tanpa
      // menunggu refetch me (menghindari race redirect, bug #1).
      const user = extractSyncedUser(result)
      if (user) {
        queryClient.setQueryData(['auth', 'me'], user)
      } else {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      }
      navigate(from, { replace: true })
    },
  })

  useEffect(() => {
    if (sessionQuery.isFetching) {
      return
    }

    if (sessionQuery.data) {
      navigate(from, { replace: true })
      return
    }

    if (handoffCode || ssoToken) {
      const syncKey = handoffCode || ssoToken
      if (lastSyncedRef.current === syncKey) {
        return
      }

      lastSyncedRef.current = syncKey
      syncMutation.mutate()
      return
    }

    if (redirectedToSignInRef.current || selfRedirectBlocked) {
      return
    }

    redirectedToSignInRef.current = true
    const redirectTarget = getPengawasPublicPath(from)
    const signInUrl = getMainAppSignInUrl(redirectTarget)
    if (signInUrl === window.location.href) {
      // VITE_MAIN_APP_URL belum dikonfigurasi dan origin sama dengan app ini:
      // replace akan loop ke halaman ini sendiri. Tampilkan error saja.
      setSelfRedirectBlocked(true)
      return
    }
    window.location.replace(signInUrl)
  }, [
    from,
    handoffCode,
    ssoToken,
    syncMutation,
    sessionQuery.data,
    sessionQuery.isFetching,
    navigate,
    selfRedirectBlocked,
  ])

  const error =
    syncMutation.error instanceof ApiError ? syncMutation.error.message : null

  const showSyncing =
    syncMutation.isPending
    || ((handoffCode || ssoToken) && sessionQuery.isFetching && !syncMutation.isError)

  if (selfRedirectBlocked) {
    return (
      <div className="auth-page">
        <Surface className="auth-card">
          <div className="auth-eyebrow">Arumanis</div>
          <h1 className="auth-title">Konfigurasi login belum lengkap</h1>
          <p className="auth-description">
            Alamat aplikasi utama (VITE_MAIN_APP_URL) belum dikonfigurasi sehingga tidak bisa
            mengalihkan ke login Arumanis. Hubungi administrator.
          </p>
        </Surface>
      </div>
    )
  }

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

  if (showSyncing) {
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
          <div className="pagination-actions pagination-actions--start">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={syncMutation.isPending}
              onClick={() => {
                lastSyncedRef.current = null
                syncMutation.reset()
                syncMutation.mutate()
              }}
            >
              Coba lagi
            </Button>
          </div>
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

/** Ambil AuthUser dari hasil sync-token ({user}) maupun exchange-handoff (datar). */
function extractSyncedUser(result: unknown): AuthUser | null {
  if (!result || typeof result !== 'object') {
    return null
  }

  const record = result as Record<string, unknown>
  if (record.user && typeof record.user === 'object') {
    return record.user as AuthUser
  }

  if ('id' in record) {
    return result as AuthUser
  }

  return null
}