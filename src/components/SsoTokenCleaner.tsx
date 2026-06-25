import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSsoTokenFromSearch, stripSsoTokenFromPath } from '@/lib/sso-token'

/**
 * Removes SSO token params from the URL after the session is established.
 * Prevents redirect loops caused by ?token=... persisting on protected routes.
 */
export function SsoTokenCleaner() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = getSsoTokenFromSearch(location.search)
    if (!token) {
      return
    }

    const cleanPath = stripSsoTokenFromPath(`${location.pathname}${location.search}${location.hash}`)
    navigate(cleanPath, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  return null
}