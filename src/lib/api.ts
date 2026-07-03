import type {
  ApiEnvelope,
  AuthUser,
  DashboardStats,
  ChecklistMatrixResponse,
  PekerjaanMediaResponse,
  PaginatedResponse,
  Pekerjaan,
  PekerjaanDetail,
  Foto,
  Output,
  Penerima,
  Pengawas,
  PengawasStatistics,
  ProgressReportView,
  PekerjaanProgressEstimasi,
  PekerjaanProgressEstimasiResponse,
  SavePekerjaanProgressEstimasiPayload,
  KontrakAddendum,
  KontrakAddendumRegisterGapResponse,
  KontrakDetail,
  Tiket,
  UnknownRecord,
} from '@/lib/types'

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

const BASE = import.meta.env.BASE_URL
const API_PREFIX = `${BASE}bff/api`
const BFF_PREFIX = `${BASE}bff`

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | UnknownRecord | null
}

function toBody(body: RequestOptions['body']) {
  if (body == null) return undefined
  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
    return body
  }
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

function buildHeaders(headers?: HeadersInit, body?: RequestOptions['body']) {
  const next = new Headers(headers)
  next.set('Accept', 'application/json')

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
    next.set('Content-Type', 'application/json')
  }

  return next
}

export async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const { body: rawBody, ...rest } = options
  const init: RequestInit = {
    credentials: 'include',
    ...rest,
    headers: buildHeaders(rest.headers, rawBody),
  }

  const body = toBody(rawBody)
  if (body !== undefined) {
    init.body = body
  }

  logRequest('api', 'request', `${API_PREFIX}${path}`, init.method ?? 'GET')
  const response = await fetch(`${API_PREFIX}${path}`, init)

  const payload = await readPayload(response)
  logResponse('api', `${API_PREFIX}${path}`, response.status, payload)

  if (!response.ok) {
    const message = extractMessage(payload) || response.statusText || 'Request failed'
    logError('api', `${API_PREFIX}${path}`, response.status, payload)
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
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

export async function login(input: { email: string; password: string }) {
  const payload = await requestBffJson<ApiEnvelope<{ user: AuthUser }>>('/auth/login', {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<AuthUser>(payload)
}

export async function syncAuthToken(token: string) {
  return requestBffJson('/auth/sync-token', {
    method: 'POST',
    body: { token },
  })
}

export async function exchangeHandoffCode(code: string) {
  const payload = await requestBffJson<ApiEnvelope<{ user: AuthUser }> | { user: AuthUser }>(
    '/auth/exchange-handoff',
    {
      method: 'POST',
      body: { code },
    },
  )

  return unwrapEntity<AuthUser>(payload)
}

export async function logout() {
  return requestBffJson('/auth/logout', { method: 'POST' })
}

export async function me() {
  const payload = await requestBffJson<ApiEnvelope<AuthUser> | AuthUser>('/auth/me')
  return unwrapEntity<AuthUser>(payload)
}

async function requestBffJson<T>(path: string, options: RequestOptions = {}) {
  const { body: rawBody, ...rest } = options
  const init: RequestInit = {
    credentials: 'include',
    ...rest,
    headers: buildHeaders(rest.headers, rawBody),
  }

  const body = toBody(rawBody)
  if (body !== undefined) {
    init.body = body
  }

  logRequest('bff', 'request', `${BFF_PREFIX}${path}`, init.method ?? 'GET')
  const response = await fetch(`${BFF_PREFIX}${path}`, init)
  const payload = await readPayload(response)
  logResponse('bff', `${BFF_PREFIX}${path}`, response.status, payload)

  if (!response.ok) {
    const message = extractMessage(payload) || response.statusText || 'Request failed'
    logError('bff', `${BFF_PREFIX}${path}`, response.status, payload)
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

function logRequest(scope: 'api' | 'bff', stage: 'request', url: string, method: string) {
  console.log(`[pengawas ${scope}] ${stage}`, { url, method })
}

function logResponse(scope: 'api' | 'bff', url: string, status: number, payload: unknown) {
  console.log(`[pengawas ${scope}] response`, { url, status, payload: summarizePayload(payload) })
}

function logError(scope: 'api' | 'bff', url: string, status: number, payload: unknown) {
  console.error(`[pengawas ${scope}] error`, { url, status, payload: summarizePayload(payload) })
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

export async function getPengawasStatistics() {
  const payload = await requestJson<ApiEnvelope<PengawasStatistics>>('/pengawas/statistics')
  return unwrapEntity<PengawasStatistics>(payload)
}

export async function getDashboardStats(tahun?: string) {
  const query = new URLSearchParams()
  if (tahun) query.set('tahun', tahun)
  const payload = await requestJson<ApiEnvelope<DashboardStats>>(`/dashboard/stats${query.size ? `?${query}` : ''}`)
  return unwrapEntity<DashboardStats>(payload)
}

export async function getPekerjaanList(params: Record<string, string | number | undefined | null> = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      query.set(key, `${value}`)
    }
  })

  const payload = await requestJson<PaginatedResponse<Pekerjaan> | ApiEnvelope<Pekerjaan[]>>(
    `/pekerjaan${query.size ? `?${query}` : ''}`,
  )

  return unwrapCollection<Pekerjaan>(payload)
}

export async function getPekerjaanDetail(pekerjaanId: number | string) {
  const payload = await requestJson<ApiEnvelope<PekerjaanDetail> | PekerjaanDetail>(`/pekerjaan/${pekerjaanId}`)
  return unwrapEntity<PekerjaanDetail>(payload)
}

export async function getPekerjaanMedia(pekerjaanId: number | string) {
  const payload = await requestJson<ApiEnvelope<PekerjaanMediaResponse> | PekerjaanMediaResponse>(`/pekerjaan/${pekerjaanId}/media`)
  return unwrapEntity<PekerjaanMediaResponse>(payload)
}

export async function getPenerimaByPekerjaan(pekerjaanId: number | string) {
  const payload = await requestJson<PaginatedResponse<Penerima> | ApiEnvelope<Penerima[]>>(`/penerima/pekerjaan/${pekerjaanId}`)
  return unwrapCollection<Penerima>(payload).data
}

export async function createPenerima(input: {
  pekerjaan_id: number | string
  nama: string
  jumlah_jiwa?: number | string | undefined
  nik?: string | undefined
  alamat?: string | undefined
  is_komunal?: boolean
}) {
  const payload = await requestJson<ApiEnvelope<Penerima>>('/penerima', {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<Penerima>(payload)
}

export async function updatePenerima(
  penerimaId: number | string,
  input: {
    pekerjaan_id?: number | string
    nama?: string
    jumlah_jiwa?: number | string | undefined
    nik?: string | undefined
    alamat?: string | undefined
    is_komunal?: boolean
  },
) {
  const payload = await requestJson<ApiEnvelope<Penerima>>(`/penerima/${penerimaId}`, {
    method: 'PUT',
    body: input,
  })

  return unwrapEntity<Penerima>(payload)
}

export async function deletePenerima(penerimaId: number | string) {
  const payload = await requestJson<ApiEnvelope<unknown>>(`/penerima/${penerimaId}`, {
    method: 'DELETE',
  })

  return unwrapEntity<unknown>(payload)
}

export async function createOutput(input: {
  pekerjaan_id: number | string
  komponen: string
  satuan?: string
  volume?: number | string | null
  penerima_is_optional?: boolean
}) {
  const payload = await requestJson<ApiEnvelope<Output>>('/output', {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<Output>(payload)
}

export async function updateOutput(
  outputId: number | string,
  input: {
    komponen?: string
    satuan?: string
    volume?: number | string | null
    penerima_is_optional?: boolean
  },
) {
  const payload = await requestJson<ApiEnvelope<Output>>(`/output/${outputId}`, {
    method: 'PUT',
    body: input,
  })

  return unwrapEntity<Output>(payload)
}

export async function deleteOutput(outputId: number | string) {
  const payload = await requestJson<ApiEnvelope<unknown>>(`/output/${outputId}`, {
    method: 'DELETE',
  })

  return unwrapEntity<unknown>(payload)
}

export async function createFoto(input: FormData) {
  const payload = await requestJson<ApiEnvelope<Foto>>('/foto', {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<Foto>(payload)
}

export type KoordinatValidationResult = {
  validasi_koordinat: boolean
  validasi_koordinat_message: string
}

export async function validateKoordinat(pekerjaanId: number | string, koordinat: string) {
  const payload = await requestJson<ApiEnvelope<KoordinatValidationResult> | KoordinatValidationResult>(
    '/koordinat/validate',
    {
      method: 'POST',
      body: {
        pekerjaan_id: Number(pekerjaanId),
        koordinat,
      },
    },
  )

  return unwrapEntity<KoordinatValidationResult>(payload)
}

export async function deleteFoto(fotoId: number | string) {
  const payload = await requestJson<ApiEnvelope<unknown>>(`/foto/${fotoId}`, {
    method: 'DELETE',
  })

  return unwrapEntity<unknown>(payload)
}

export async function getProgressReport(pekerjaanId: number | string) {
  const payload = await requestJson<ApiEnvelope<ProgressReportView> | ProgressReportView>(`/progress/pekerjaan/${pekerjaanId}`)
  return unwrapEntity<ProgressReportView>(payload)
}

export async function updateProgress(pekerjaanId: number | string, input: { items: unknown[]; week_count: number }) {
  const payload = await requestJson<ApiEnvelope<unknown>>(`/progress/pekerjaan/${pekerjaanId}`, {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<unknown>(payload)
}

export async function getPekerjaanChecklist(params: Record<string, string | number | undefined | null> = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      query.set(key, `${value}`)
    }
  })

  const payload = await requestJson<ChecklistMatrixResponse>(`/pekerjaan-checklist${query.size ? `?${query}` : ''}`)
  return payload as ChecklistMatrixResponse
}

export async function togglePekerjaanChecklist(input: {
  pekerjaan_id: number | string
  checklist_item_id: number | string
  is_checked: boolean
  notes?: string | undefined
}) {
  const payload = await requestJson<ApiEnvelope<unknown>>('/pekerjaan-checklist/toggle', {
    method: 'POST',
    body: input,
  })

  return unwrapEntity<unknown>(payload)
}

export async function getTiketList(params: Record<string, string | number | undefined | null> = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      query.set(key, `${value}`)
    }
  })

  const payload = await requestJson<PaginatedResponse<Tiket> | ApiEnvelope<Tiket[]>>(`/tiket${query.size ? `?${query}` : ''}`)
  return unwrapCollection<Tiket>(payload)
}

export async function addTiketComment(tiketId: number | string, message: string) {
  const payload = await requestJson<ApiEnvelope<unknown>>(`/tiket/${tiketId}/comments`, {
    method: 'POST',
    body: { message },
  })

  return unwrapEntity<unknown>(payload)
}

export async function createTiket(input: {
  pekerjaan_id?: number | string | null
  subjek: string
  deskripsi: string
  kategori: string
  prioritas: string
  attachment?: File | null | undefined
}) {
  const body =
    input.attachment instanceof File
      ? (() => {
          const formData = new FormData()
          if (input.pekerjaan_id !== undefined && input.pekerjaan_id !== null && `${input.pekerjaan_id}`.trim() !== '') {
            formData.append('pekerjaan_id', String(input.pekerjaan_id))
          }
          formData.append('subjek', input.subjek)
          formData.append('deskripsi', input.deskripsi)
          formData.append('kategori', input.kategori)
          formData.append('prioritas', input.prioritas)
          formData.append('attachment', input.attachment)
          return formData
        })()
      : {
          pekerjaan_id: input.pekerjaan_id,
          subjek: input.subjek,
          deskripsi: input.deskripsi,
          kategori: input.kategori,
          prioritas: input.prioritas,
        }

  const payload = await requestJson<ApiEnvelope<unknown>>('/tiket', {
    method: 'POST',
    body,
  })

  return unwrapEntity<unknown>(payload)
}

export async function getPengawasList() {
  const payload = await requestJson<ApiEnvelope<Pengawas[]> | PaginatedResponse<Pengawas>>('/pengawas')
  return unwrapCollection<Pengawas>(payload).data
}

function unwrapProgressEstimasiResponse(payload: unknown): PekerjaanProgressEstimasiResponse {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const data = unwrapEntity<PekerjaanProgressEstimasi>(payload)
  const puspen = Array.isArray(record.puspen_progress_fisik) ? record.puspen_progress_fisik : []

  return {
    data,
    puspen_progress_fisik: puspen as PekerjaanProgressEstimasiResponse['puspen_progress_fisik'],
  }
}

export async function getPekerjaanProgressEstimasi(pekerjaanId: number | string, tahun: number) {
  const query = new URLSearchParams({ tahun: String(tahun) })
  const payload = await requestJson<unknown>(`/pekerjaan/${pekerjaanId}/progress-estimasi?${query}`)
  return unwrapProgressEstimasiResponse(payload)
}

export async function savePekerjaanProgressEstimasi(
  pekerjaanId: number | string,
  input: SavePekerjaanProgressEstimasiPayload,
) {
  const payload = await requestJson<unknown>(`/pekerjaan/${pekerjaanId}/progress-estimasi`, {
    method: 'PUT',
    body: input,
  })

  return unwrapProgressEstimasiResponse(payload)
}

export async function getKontrakDetail(kontrakId: number | string) {
  const payload = await requestJson<ApiEnvelope<KontrakDetail> | KontrakDetail>(`/kontrak/${kontrakId}`)
  return unwrapEntity<KontrakDetail>(payload)
}

export async function getKontrakAddendumRegisterGaps(kontrakId: number | string) {
  const payload = await requestJson<ApiEnvelope<KontrakAddendumRegisterGapResponse> | KontrakAddendumRegisterGapResponse>(
    `/kontrak/${kontrakId}/addendum-register-gaps`,
  )

  if (payload && typeof payload === 'object' && 'items' in payload) {
    return payload as KontrakAddendumRegisterGapResponse
  }

  return unwrapEntity<KontrakAddendumRegisterGapResponse>(payload)
}

export async function createKontrakAddendum(kontrakId: number | string, formData: FormData) {
  const payload = await requestJson<ApiEnvelope<KontrakAddendum>>(`/kontrak/${kontrakId}/addendums`, {
    method: 'POST',
    body: formData,
  })

  return unwrapEntity<KontrakAddendum>(payload)
}

export async function submitKontrakAddendum(addendumId: number | string) {
  const payload = await requestJson<ApiEnvelope<KontrakAddendum>>(`/kontrak-addendums/${addendumId}/submit`, {
    method: 'POST',
  })

  return unwrapEntity<KontrakAddendum>(payload)
}
