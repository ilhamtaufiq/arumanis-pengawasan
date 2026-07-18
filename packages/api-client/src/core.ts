import type { PaginatedResponse, UnknownRecord } from '@pengawas/shared'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export type RequestBody = BodyInit | UnknownRecord | null | undefined

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: RequestBody
}

export type ApiLogger = {
  request?: (scope: 'api' | 'bff', url: string, method: string) => void
  response?: (scope: 'api' | 'bff', url: string, status: number, payload: unknown) => void
  error?: (scope: 'api' | 'bff', url: string, status: number, payload: unknown) => void
}

export type GetAuthHeader = () => string | null | undefined | Promise<string | null | undefined>

export type ApiClientConfig = {
  apiPrefix: string
  bffPrefix: string
  credentials?: RequestCredentials
  getAuthHeader?: GetAuthHeader
  logger?: ApiLogger
}

function toBody(body: RequestBody) {
  if (body == null) return undefined
  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
    return body
  }
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

async function buildHeaders(
  headers: HeadersInit | undefined,
  body: RequestBody,
  getAuthHeader?: ApiClientConfig['getAuthHeader'],
) {
  const next = new Headers(headers)
  next.set('Accept', 'application/json')
  // Konteks app lapangan — dual operator+pengawas di APIAMIS dibatasi user_pekerjaan.
  if (!next.has('X-Arumanis-App')) {
    next.set('X-Arumanis-App', 'pengawas')
  }

  const authHeader = await Promise.resolve(getAuthHeader?.())
  if (authHeader) {
    next.set('Authorization', authHeader)
  }

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
    next.set('Content-Type', 'application/json')
  }

  return next
}

async function readPayload(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (response.status === 204) return null

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const text = await response.text()
  return text || null
}

function extractMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>

  if (typeof record.message === 'string') return record.message
  if (typeof record.error === 'string') return record.error

  return null
}

function extractValidationMessages(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const errors = (payload as Record<string, unknown>).errors
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors as Record<string, unknown>).flatMap((value) => {
    if (!Array.isArray(value)) {
      return []
    }

    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  })
}

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return { type: typeof payload, value: payload }
  }

  const record = payload as Record<string, unknown>
  const summary: Record<string, unknown> = {
    type: 'object',
    keys: Object.keys(record),
  }

  if (Array.isArray(record.data)) {
    summary.dataType = 'array'
    summary.dataCount = record.data.length
  } else if (record.data && typeof record.data === 'object') {
    summary.dataType = 'object'
    summary.dataKeys = Object.keys(record.data as Record<string, unknown>)
  }

  if (typeof record.message === 'string') {
    summary.message = record.message
  }

  if (typeof record.error === 'string') {
    summary.error = record.error
  }

  return summary
}

export function formatApiError(error: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (error instanceof ApiError) {
    const validationMessages = extractValidationMessages(error.payload)
    const baseMessage = extractMessage(error.payload) || error.message

    if (validationMessages.length > 0) {
      const unique = [...new Set(validationMessages)]
      if (baseMessage && !unique.includes(baseMessage)) {
        return [baseMessage, ...unique].join('\n')
      }
      return unique.join('\n')
    }

    return baseMessage || fallback
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export function unwrapEntity<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') return payload as T

  const record = payload as Record<string, unknown>

  if ('data' in record && record.data !== undefined && !Array.isArray(record.data)) {
    return record.data as T
  }

  if ('user' in record && record.user !== undefined) {
    return record.user as T
  }

  return payload as T
}

export function unwrapCollection<T>(payload: unknown): PaginatedResponse<T> {
  if (!payload || typeof payload !== 'object') {
    return { data: [] }
  }

  const record = payload as Record<string, unknown>
  const items = Array.isArray(record.data) ? (record.data as T[]) : []

  const result: PaginatedResponse<T> = { data: items }

  if (typeof record.links === 'object' && record.links) {
    result.links = record.links as UnknownRecord
  }

  if (typeof record.meta === 'object' && record.meta) {
    result.meta = record.meta as UnknownRecord
  }

  return result
}

export function getPaginationMeta(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const meta = record.meta

  if (!meta || typeof meta !== 'object') return null

  return meta as UnknownRecord
}

export function createHttpTransport(config: ApiClientConfig) {
  const credentials = config.credentials ?? 'include'

  async function request(url: string, scope: 'api' | 'bff', options: RequestOptions = {}) {
    const { body: rawBody, ...rest } = options
    const init: RequestInit = {
      credentials,
      ...rest,
      headers: await buildHeaders(rest.headers, rawBody, config.getAuthHeader),
    }

    const body = toBody(rawBody)
    if (body !== undefined) {
      init.body = body
    }

    config.logger?.request?.(scope, url, init.method ?? 'GET')
    const response = await fetch(url, init)
    const payload = await readPayload(response)
    config.logger?.response?.(scope, url, response.status, summarizePayload(payload))

    if (!response.ok) {
      const message = extractMessage(payload) || response.statusText || 'Request failed'
      config.logger?.error?.(scope, url, response.status, summarizePayload(payload))
      throw new ApiError(message, response.status, payload)
    }

    return payload
  }

  return {
    requestApi: <T>(path: string, options?: RequestOptions) =>
      request(`${config.apiPrefix}${path}`, 'api', options) as Promise<T>,
    requestBff: <T>(path: string, options?: RequestOptions) =>
      request(`${config.bffPrefix}${path}`, 'bff', options) as Promise<T>,
  }
}