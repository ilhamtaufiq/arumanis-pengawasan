import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { login, ApiError, syncAuthToken } from '@/lib/api'
import { Button, Input, Label, Surface } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const ssoToken = searchParams.get('token') || searchParams.get('access_token') || searchParams.get('auth_token')
  const from = normalizeRedirectTarget(
    (location.state as { from?: string } | null)?.from || searchParams.get('redirect') || searchParams.get('next') || '/',
  )
  const lastSyncedTokenRef = useRef<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const syncMutation = useMutation({
    mutationFn: () => {
      if (!ssoToken) {
        throw new Error('Token SSO tidak tersedia')
      }

      return syncAuthToken(ssoToken)
    },
    onSuccess: () => {
      navigate(from, { replace: true })
    },
  })

  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: () => {
      navigate(from, { replace: true })
    },
  })

  useEffect(() => {
    if (!ssoToken || lastSyncedTokenRef.current === ssoToken) {
      return
    }

    lastSyncedTokenRef.current = ssoToken
    syncMutation.mutate()
  }, [ssoToken, syncMutation])

  const error =
    syncMutation.error instanceof ApiError
      ? syncMutation.error.message
      : mutation.error instanceof ApiError
        ? mutation.error.message
        : null
  const isSyncing = Boolean(ssoToken) && syncMutation.isPending

  if (isSyncing) {
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

  return (
    <div className="auth-page">
      <Surface className="auth-card">
        <div className="auth-eyebrow">Arumanis</div>
        <h1 className="auth-title">Masuk ke panel pengawasan</h1>
        <p className="auth-description">
          Gunakan akun `apiamis` untuk melihat pekerjaan, progress, dan tiket yang ditugaskan.
        </p>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="field">
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@contoh.id"
              required
            />
          </div>

          <div className="field">
            <Label>Password</Label>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <Button type="submit" isLoading={mutation.isPending} className="auth-submit">
            Masuk
          </Button>
        </form>
      </Surface>
    </div>
  )
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
