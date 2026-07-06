import { useQuery } from '@tanstack/react-query'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/Layout'
import { SsoEntryGate } from '@/components/SsoEntryGate'
import { SsoTokenCleaner } from '@/components/SsoTokenCleaner'
import { Spinner, Surface } from '@/components/ui'
import { logout, me } from '@/lib/api'
import {
  getPengawasPublicPath,
  getHandoffCodeFromSearch,
  getSsoTokenFromSearch,
  redirectToMainAppSignIn,
} from '@/lib/sso-token'

const DashboardPage = lazy(async () => ({ default: (await import('@/pages/DashboardPage')).DashboardPage }))
const LoginPage = lazy(async () => ({ default: (await import('@/pages/LoginPage')).LoginPage }))
const NotFoundPage = lazy(async () => ({ default: (await import('@/pages/NotFoundPage')).NotFoundPage }))
const ForbiddenPage = lazy(async () => ({ default: (await import('@/pages/ForbiddenPage')).ForbiddenPage }))
const ErrorPage = lazy(async () => ({ default: (await import('@/pages/ErrorPage')).ErrorPage }))
const GuidePage = lazy(async () => ({ default: (await import('@/pages/GuidePage')).GuidePage }))
const PekerjaanDetailPage = lazy(
  async () => ({ default: (await import('@/pages/PekerjaanDetailPage')).PekerjaanDetailPage }),
)
const PekerjaanPage = lazy(async () => ({ default: (await import('@/pages/PekerjaanPage')).PekerjaanPage }))
const ProfilePage = lazy(async () => ({ default: (await import('@/pages/ProfilePage')).ProfilePage }))
const TiketPage = lazy(async () => ({ default: (await import('@/pages/TiketPage')).TiketPage }))
const BuatLaporanListPage = lazy(
  async () => ({ default: (await import('@/pages/BuatLaporanListPage')).BuatLaporanListPage }),
)
const BuatLaporanPage = lazy(async () => ({ default: (await import('@/pages/BuatLaporanPage')).BuatLaporanPage }))
const NotificationsPage = lazy(
  async () => ({ default: (await import('@/pages/NotificationsPage')).NotificationsPage }),
)
export function App() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <Surface className="auth-card auth-card--loading">
            <Spinner />
            <div>Memuat aplikasi...</div>
          </Surface>
        </div>
      }
    >
      <Routes>
        <Route element={<SsoEntryGate />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-in" element={<LoginPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pekerjaan" element={<PekerjaanPage />} />
            <Route path="/pekerjaan/:pekerjaanId" element={<PekerjaanDetailPage />} />
            <Route path="/buat-laporan" element={<BuatLaporanListPage />} />
            <Route path="/buat-laporan/:pekerjaanId" element={<BuatLaporanPage />} />
            <Route path="/tiket" element={<TiketPage />} />
            <Route path="/panduan" element={<GuidePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifikasi" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function ProtectedRoute() {
  const location = useLocation()
  const redirectedRef = useRef(false)
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
    retry: false,
  })

  const needsAuthRedirect = !query.isLoading && (query.isError || !query.data)
  const hasSsoBootstrap = Boolean(
    getSsoTokenFromSearch(location.search) || getHandoffCodeFromSearch(location.search),
  )
  useEffect(() => {
    if (!needsAuthRedirect || hasSsoBootstrap || redirectedRef.current) {
      return
    }

    redirectedRef.current = true
    redirectToMainAppSignIn(
      getPengawasPublicPath(location.pathname, location.search),
    )
  }, [hasSsoBootstrap, location.pathname, location.search, needsAuthRedirect])

  if (query.isLoading || (needsAuthRedirect && hasSsoBootstrap)) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <Spinner />
          <div>{needsAuthRedirect && hasSsoBootstrap ? 'Menyiapkan sesi SSO...' : 'Memeriksa sesi...'}</div>
        </Surface>
      </div>
    )
  }

  if (needsAuthRedirect) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <Spinner />
          <div>Mengalihkan ke login Arumanis...</div>
        </Surface>
      </div>
    )
  }

  const user = query.data
  if (!user) {
    return null
  }

  return (
    <AppLayout
      user={user}
      onLogout={async () => {
        try {
          await logout()
        } finally {
          redirectToMainAppSignIn()
        }
      }}
    >
      <SsoTokenCleaner />
      <Outlet />
    </AppLayout>
  )
}
