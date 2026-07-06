import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSegments } from 'expo-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '@pengawas/shared'
import { queryKeys } from '@pengawas/shared/query-keys'
import { ApiError } from '@pengawas/api-client'
import {
  hydrateSessionToken,
  me,
  mobileGoogleLogin,
  mobileLogin,
  mobileLogout,
  setSessionTokenSync,
} from '@/lib/api'
import { pauseBackgroundLocationTracking } from '@/lib/background-location'
import { disconnectEcho } from '@/lib/echo'
import { clearSessionToken } from '@/lib/session'

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Sesi sudah di-bootstrap dan /auth/me sukses — aman untuk fetch API terproteksi */
  canFetch: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const queryClient = useQueryClient()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    hydrateSessionToken()
      .then((token) => {
        setSessionTokenSync(token)
        setHasToken(Boolean(token))
      })
      .finally(() => setBootstrapped(true))
  }, [])

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: me,
    enabled: bootstrapped && hasToken,
    retry: false,
  })

  const isAuthenticated = Boolean(meQuery.data)
  const canFetch = bootstrapped && hasToken && isAuthenticated
  const isLoading = !bootstrapped || (hasToken && meQuery.isLoading)

  useEffect(() => {
    if (!canFetch) return

    void queryClient.invalidateQueries({
      predicate: (query) => {
        if (query.state.status !== 'error') return false
        const error = query.state.error
        return error instanceof ApiError && error.status === 401
      },
    })
  }, [canFetch, queryClient])

  useEffect(() => {
    if (!bootstrapped || meQuery.isLoading) return

    const inAuthGroup = segments[0] === 'login'

    if (meQuery.isError) {
      const status = meQuery.error instanceof ApiError ? meQuery.error.status : null
      if (status === 401 || status === 403) {
        void clearSessionToken()
        setSessionTokenSync(null)
        setHasToken(false)
        if (!inAuthGroup) router.replace('/login')
      }
      return
    }

    if (!hasToken && !inAuthGroup) {
      router.replace('/login')
      return
    }

    if (hasToken && !meQuery.data && !meQuery.isError && !inAuthGroup) {
      return
    }

    if (hasToken && !meQuery.data && meQuery.isError && !inAuthGroup) {
      router.replace('/login')
      return
    }

    if (meQuery.data && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [bootstrapped, hasToken, meQuery.data, meQuery.isError, meQuery.isLoading, router, segments])

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      await mobileLogin(input)
      setHasToken(true)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
    },
    [queryClient],
  )

  const loginWithGoogle = useCallback(async () => {
    await mobileGoogleLogin()
    setHasToken(true)
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  }, [queryClient])

  const logout = useCallback(async () => {
    disconnectEcho()
    await pauseBackgroundLocationTracking()
    await mobileLogout()
    setHasToken(false)
    queryClient.clear()
    router.replace('/login')
  }, [queryClient, router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading,
      isAuthenticated,
      canFetch,
      login,
      loginWithGoogle,
      logout,
    }),
    [canFetch, isAuthenticated, isLoading, login, loginWithGoogle, logout, meQuery.data],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}