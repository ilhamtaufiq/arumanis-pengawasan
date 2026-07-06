import type { AuthUser } from '@/lib/types'
import { AnchorButton, Button, cn, WelcomeModal } from '@/components/ui'
import { BannerNotification } from '@/components/BannerNotification'
import { ImpersonateBanner } from '@/components/ImpersonateBanner'
import { PendingFotoUploadBanner } from '@/components/PendingFotoUploadBanner'
import { NotificationBell } from '@/components/NotificationBell'
import {
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  BookOpenText,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle2,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime'
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat'
import { LiveChatWidget } from '@/features/live-chat/LiveChatWidget'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pekerjaan', label: 'Pekerjaan', icon: ClipboardList },
  { to: '/buat-laporan', label: 'Buat Laporan', icon: FileSpreadsheet },
  { to: '/tiket', label: 'Tiket', icon: MessageSquareText },
  { to: '/panduan', label: 'Panduan', icon: BookOpenText },
  { to: '/profile', label: 'Profil', icon: UserCircle2 },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/pekerjaan': 'Daftar Pekerjaan',
  '/buat-laporan': 'Buat Laporan Mingguan',
  '/tiket': 'Tiket & Isu Lapangan',
  '/panduan': 'Panduan Pengguna',
  '/profile': 'Profil Pengguna',
  '/notifikasi': 'Notifikasi',
}

function getPageTitle(pathname: string) {
  // exact match
  if (pageTitles[pathname]) return pageTitles[pathname]
  // detail pekerjaan
  if (pathname.startsWith('/pekerjaan/')) return 'Detail Pekerjaan'
  if (pathname.startsWith('/buat-laporan/')) return 'Form Laporan Mingguan'
  return 'Pengawasan'
}

export function AppLayout({
  user,
  onLogout,
  children,
}: {
  user: AuthUser
  onLogout: () => void
  children?: ReactNode
}) {
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true

    const stored = window.localStorage.getItem('arumanis.sidebar-open')
    if (stored !== null) return stored === 'true'

    return window.innerWidth >= 1100
  })
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [notificationPopupBlocking, setNotificationPopupBlocking] = useState(true)
  const welcomeEligible =
    typeof window !== 'undefined' && window.localStorage.getItem('arumanis.welcome-hidden') !== 'true'
  const welcomeOpen = welcomeEligible && !welcomeDismissed && !notificationPopupBlocking

  const currentTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  usePresenceHeartbeat()
  useNotificationRealtime(user.id)

  useEffect(() => {
    window.localStorage.setItem('arumanis.sidebar-open', String(sidebarOpen))
  }, [sidebarOpen])

  function handleNavClick() {
    if (window.innerWidth < 1100) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className={cn('app-shell', sidebarOpen && 'app-shell--sidebar-open', !sidebarOpen && 'app-shell--sidebar-collapsed')}>
      {sidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Tutup sidebar" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="brand-block">
          <div className="brand-logo-wrapper">
            <img
              src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/arumanis.png`}
              alt="Arumanis"
              className="brand-logo"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="brand-title">Arumanis</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn('nav-item', isActive && 'nav-item--active')}
                onClick={handleNavClick}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <NotificationBell placement="sidebar" />
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <Button variant="ghost" className="logout-button" onClick={onLogout} aria-label="Keluar">
            <LogOut size={16} />
            <span className="logout-label">Keluar</span>
          </Button>
        </div>
      </aside>

      <div className="main-panel">
        <ImpersonateBanner />
        <header className="topbar">
          <div className="topbar-left">
            <Button
              type="button"
              variant="neutral"
              className="sidebar-toggle"
              aria-label={sidebarOpen ? 'Kecilkan sidebar' : 'Buka sidebar'}
              aria-pressed={sidebarOpen}
              onClick={() => setSidebarOpen((current) => !current)}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </Button>
            <div className="topbar-brand">
              <div className="topbar-kicker">Arumanis • Air Minum &amp; Sanitasi</div>
              <h1 className="topbar-title">{currentTitle}</h1>
            </div>
          </div>
          <div className="topbar-user">
            <div className="topbar-user-name">{user.name}</div>
            <div className="topbar-user-role">
              {Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0]?.name : 'pengguna'}
            </div>
            <AnchorButton variant="neutral" to="/profile" className="topbar-user-link">
              Profil
            </AnchorButton>
          </div>
        </header>

        <PendingFotoUploadBanner />

        <main className="page-content">{children ?? <Outlet />}</main>
      </div>

      <BannerNotification onBlockingChange={setNotificationPopupBlocking} />

      <WelcomeModal
        open={welcomeOpen}
        userName={user.name}
        description="Panel ini menampilkan pekerjaan yang benar-benar Anda awasi. Mulai dari dashboard, lalu masuk ke detail paket untuk update progress, foto, dan tiket."
        guideTo="/panduan"
        onClose={() => setWelcomeDismissed(true)}
        onHideForever={() => {
          window.localStorage.setItem('arumanis.welcome-hidden', 'true')
          setWelcomeDismissed(true)
        }}
      />

      <LiveChatWidget user={user} />
    </div>
  )
}
