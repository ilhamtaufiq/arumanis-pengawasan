import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getApiBaseUrl } from '@/lib/config'
import { getSessionTokenSync } from '@/lib/session'
import { formatAppBuildSummary, getAppBuildInfo } from '@/lib/app-build-info'

export type ClientErrorSource =
  | 'react'
  | 'react-native'
  | 'window.error'
  | 'unhandledrejection'
  | 'console.error'
  | 'manual'
  | 'fatal'

type ReportInput = {
  source: ClientErrorSource
  message: string
  stack?: string | null
  componentStack?: string | null
  metadata?: Record<string, unknown>
}

const recentKeys = new Map<string, number>()
const TTL_MS = 60_000
let handlersInstalled = false

function shouldSend(key: string) {
  const now = Date.now()
  const last = recentKeys.get(key)
  if (last && now - last < TTL_MS) return false
  recentKeys.set(key, now)
  return true
}

function normalizeMessage(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { message: error }
  }
  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: String(error) }
  }
}

/**
 * Kirim error ke APIAMIS → muncul di www/bun fitur error-logs
 * (POST /api/client-error-reports).
 */
export async function reportClientError(input: ReportInput): Promise<void> {
  const message = (input.message || '').trim()
  if (!message) return

  const key = `${input.source}:${message.slice(0, 180)}:${(input.stack || '').slice(0, 120)}`
  if (!shouldSend(key)) return

  const build = getAppBuildInfo()
  const body = {
    source: input.source,
    message: message.slice(0, 5000),
    stack: input.stack?.slice(0, 50_000) ?? null,
    component_stack: input.componentStack?.slice(0, 50_000) ?? null,
    url: `pengawas-mobile://${input.source}`,
    user_agent: `PengawasMobile/${build.appVersion} (${Platform.OS}; ${build.platform})`,
    app: 'pengawas-mobile',
    metadata: {
      app: 'pengawas-mobile',
      platform: Platform.OS,
      build: formatAppBuildSummary(build),
      updateId: build.updateId,
      channel: build.channel,
      expoRuntime: Constants.expoConfig?.sdkVersion ?? null,
      ...input.metadata,
    },
  }

  try {
    const token = getSessionTokenSync()
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (token) headers.Authorization = `Bearer ${token}`

    await fetch(`${getApiBaseUrl()}/client-error-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    // Jangan pernah melempar dari error reporter
  }
}

export function reportUnknownError(
  source: ClientErrorSource,
  error: unknown,
  extra?: { componentStack?: string; metadata?: Record<string, unknown> },
) {
  const normalized = normalizeMessage(error)
  void reportClientError({
    source,
    message: normalized.message,
    stack: normalized.stack,
    componentStack: extra?.componentStack,
    metadata: extra?.metadata,
  })
}

/**
 * Pasang handler global ErrorUtils (JS fatal) sekali di root.
 */
export function installGlobalClientErrorReporting() {
  if (handlersInstalled) return
  handlersInstalled = true

  const g = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void
    }
  }

  const errorUtils = g.ErrorUtils
  if (!errorUtils?.getGlobalHandler || !errorUtils.setGlobalHandler) return

  const previous = errorUtils.getGlobalHandler()
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportUnknownError(isFatal ? 'fatal' : 'react-native', error, {
      metadata: { isFatal: Boolean(isFatal) },
    })
    previous?.(error, isFatal)
  })
}
