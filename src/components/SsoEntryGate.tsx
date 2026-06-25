import { Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  buildSsoBootstrapSearch,
  getHandoffCodeFromSearch,
  getSsoTokenFromSearch,
  isSsoBootstrapPath,
  stripSsoTokenFromPath,
} from '@/lib/sso-token'

/**
 * Forces SSO token handoff through /login|/sign-in only.
 * Prevents ?token=... from landing on dashboard or other protected paths.
 */
export function SsoEntryGate() {
  const location = useLocation()
  const token = getSsoTokenFromSearch(location.search)
  const handoffCode = getHandoffCodeFromSearch(location.search)

  if ((token || handoffCode) && !isSsoBootstrapPath(location.pathname)) {
    const search = token
      ? buildSsoBootstrapSearch(token)
      : `?code=${encodeURIComponent(handoffCode!)}`

    return (
      <Navigate
        to={{ pathname: '/login', search }}
        state={{
          from: stripSsoTokenFromPath(`${location.pathname}${location.search}${location.hash}`),
        }}
        replace
      />
    )
  }

  return <Outlet />
}