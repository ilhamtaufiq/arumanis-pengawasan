import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/components/Layout'
import { Spinner, Surface } from '@/components/ui'
import { logout, me } from '@/lib/api'

const DashboardPage = lazy(async () => ({ default: (await import('@/pages/DashboardPage')).DashboardPage }))
const LoginPage = lazy(async () => ({ default: (await import('@/pages/LoginPage')).LoginPage }))
const NotFoundPage = lazy(async () => ({ default: (await import('@/pages/NotFoundPage')).NotFoundPage }))
const GuidePage = lazy(async () => ({ default: (await import('@/pages/GuidePage')).GuidePage }))
const PekerjaanDetailPage = lazy(
  async () => ({ default: (await import('@/pages/PekerjaanDetailPage')).PekerjaanDetailPage }),
)
const PekerjaanPage = lazy(async () => ({ default: (await import('@/pages/PekerjaanPage')).PekerjaanPage }))
const ProfilePage = lazy(async () => ({ default: (await import('@/pages/ProfilePage')).ProfilePage }))
const TiketPage = lazy(async () => ({ default: (await import('@/pages/TiketPage')).TiketPage }))

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-in" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pekerjaan" element={<PekerjaanPage />} />
          <Route path="/pekerjaan/:pekerjaanId" element={<PekerjaanDetailPage />} />
          <Route path="/tiket" element={<TiketPage />} />
          <Route path="/panduan" element={<GuidePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function ProtectedRoute() {
  const location = useLocation()
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
    retry: false,
  })

  if (query.isLoading) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <Spinner />
          <div>Memeriksa sesi...</div>
        </Surface>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return <Navigate to={{ pathname: '/login', search: location.search }} state={{ from: `${location.pathname}${location.search}` }} replace />
  }

  return (
    <AppLayout
      user={query.data}
      onLogout={async () => {
        try {
          await logout()
        } finally {
          window.location.assign(`${import.meta.env.BASE_URL}login`)
        }
      }}
    >
      <Outlet />
    </AppLayout>
  )
}
