import type { AuthUser } from '@/lib/types'
import { AnchorButton, Button, cn, WelcomeModal } from '@/components/ui'
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  BookOpenText,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle2,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pekerjaan', label: 'Pekerjaan', icon: ClipboardList },
  { to: '/tiket', label: 'Tiket', icon: MessageSquareText },
  { to: '/panduan', label: 'Panduan', icon: BookOpenText },
  { to: '/profile', label: 'Profil', icon: UserCircle2 },
]

export function AppLayout({
  user,
  onLogout,
  children,
}: {
  user: AuthUser
  onLogout: () => void
  children?: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true

    const stored = window.localStorage.getItem('arumanis.sidebar-open')
    if (stored !== null) return stored === 'true'

    return window.innerWidth >= 1100
  })
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('arumanis.welcome-hidden') !== 'true'
  })

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
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">Arumanis</div>
            <div className="brand-subtitle">Dashboard pengawasan</div>
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
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <Button variant="ghost" className="logout-button" onClick={onLogout}>
            <LogOut size={16} />
            <span>Keluar</span>
          </Button>
        </div>
      </aside>

      <div className="main-panel">
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
              <div className="topbar-kicker">Arumanis</div>
              <h1 className="topbar-title">Dashboard pengawasan</h1>
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

        <main className="page-content">{children ?? <Outlet />}</main>
      </div>

      <WelcomeModal
        open={welcomeOpen}
        title={`Selamat datang, ${user.name}`}
        description="Gunakan Arumanis untuk memantau pekerjaan yang diawasi, update progress, upload foto, dan membuat tiket. Baca Panduan terlebih dahulu sebelum mulai bekerja."
        guideTo="/panduan"
        onClose={() => setWelcomeOpen(false)}
        onHideForever={() => {
          window.localStorage.setItem('arumanis.welcome-hidden', 'true')
          setWelcomeOpen(false)
        }}
      />
    </div>
  )
}
