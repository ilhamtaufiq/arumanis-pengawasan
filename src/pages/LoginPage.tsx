import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login, ApiError, syncAuthToken } from '@/lib/api'
import { Button, Input, Label, Surface } from '@/components/ui'

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const ssoToken = searchParams.get('token') || searchParams.get('access_token') || searchParams.get('auth_token')
  const from = normalizeRedirectTarget(
    (location.state as { from?: string } | null)?.from || searchParams.get('redirect') || searchParams.get('next') || '/',
  )
  const lastSyncedTokenRef = useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

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
    mutationFn: (data: { email: string; password: string }) => login(data),
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
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
        >
          <div className="field">
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="nama@contoh.id"
              {...register('email')}
            />
            {errors.email && <div className="form-error">{errors.email.message}</div>}
          </div>

          <div className="field">
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <div className="form-error">{errors.password.message}</div>}
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
