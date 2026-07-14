import { useIsRestoring, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  AUTH_ME_STALE_TIME_MS,
  isSessionInvalidError,
  QUERY_RESTORE_TIMEOUT_MS,
  readCachedAuthUser,
} from '@/lib/auth-session'
import { removePersistedQueryCache } from '@/lib/query-persist'
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
  const isRestoring = useIsRestoring()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [restoreTimedOut, setRestoreTimedOut] = useState(false)

  useEffect(() => {
    hydrateSessionToken()
      .then((token) => {
        setSessionTokenSync(token)
        setHasToken(Boolean(token))
      })
      .finally(() => setBootstrapped(true))
  }, [])

  useEffect(() => {
    if (!isRestoring) {
      setRestoreTimedOut(false)
      return
    }

    const timer = setTimeout(() => setRestoreTimedOut(true), QUERY_RESTORE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isRestoring])

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: me,
    enabled: bootstrapped && hasToken && (!isRestoring || restoreTimedOut),
    retry: false,
    networkMode: 'offlineFirst',
    staleTime: AUTH_ME_STALE_TIME_MS,
    placeholderData: () => readCachedAuthUser(queryClient) ?? undefined,
  })

  const cachedUser = meQuery.data ?? readCachedAuthUser(queryClient)
  const waitingForRestore = isRestoring && !restoreTimedOut
  const waitingForMe =
    hasToken &&
    !cachedUser &&
    !meQuery.isError &&
    (meQuery.isPending || meQuery.isFetching)

  const isAuthenticated = Boolean(cachedUser)
  const canFetch = bootstrapped && hasToken && isAuthenticated
  const isLoading = !bootstrapped || waitingForRestore || waitingForMe

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
    if (isLoading) return

    const inAuthGroup = segments[0] === 'login'
    const meError = meQuery.isError ? meQuery.error : null
    const offlineCachedUser = readCachedAuthUser(queryClient)

    if (meQuery.isError) {
      if (isSessionInvalidError(meError)) {
        void clearSessionToken()
        setSessionTokenSync(null)
        setHasToken(false)
        queryClient.clear()
        void removePersistedQueryCache()
        if (!inAuthGroup) router.replace('/login')
        return
      }

      if (offlineCachedUser) {
        return
      }

      if (!inAuthGroup) {
        router.replace('/login')
      }
      return
    }

    if (!hasToken && !inAuthGroup) {
      router.replace('/login')
      return
    }

    if (hasToken && !cachedUser && !meQuery.isFetching) {
      void clearSessionToken()
      setSessionTokenSync(null)
      setHasToken(false)
      if (!inAuthGroup) {
        router.replace('/login')
      }
      return
    }

    if (cachedUser && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [
    cachedUser,
    hasToken,
    isLoading,
    meQuery.error,
    meQuery.isError,
    meQuery.isFetching,
    queryClient,
    router,
    segments,
  ])

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      // Cegah bocor cache antar user (admin → pengawas di device yang sama)
      queryClient.clear()
      await removePersistedQueryCache()
      const user = await mobileLogin(input)
      setHasToken(true)
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
    [queryClient],
  )

  const loginWithGoogle = useCallback(async () => {
    queryClient.clear()
    await removePersistedQueryCache()
    const user = await mobileGoogleLogin()
    setHasToken(true)
    queryClient.setQueryData(queryKeys.auth.me(), user)
  }, [queryClient])

  const logout = useCallback(async () => {
    disconnectEcho()
    await pauseBackgroundLocationTracking()
    await mobileLogout()
    setHasToken(false)
    queryClient.clear()
    await removePersistedQueryCache()
    router.replace('/login')
  }, [queryClient, router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: cachedUser,
      isLoading,
      isAuthenticated,
      canFetch,
      login,
      loginWithGoogle,
      logout,
    }),
    [cachedUser, canFetch, isAuthenticated, isLoading, login, loginWithGoogle, logout],
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