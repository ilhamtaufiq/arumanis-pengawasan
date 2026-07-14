import type {
  ApiEnvelope,
  AuthUser,
  Berkas,
  ChecklistMatrixResponse,
  DashboardStats,
  Foto,
  KontrakAddendum,
  KontrakAddendumRegisterGapResponse,
  KontrakDetail,
  Output,
  PaginatedResponse,
  Pekerjaan,
  PekerjaanDetail,
  PekerjaanMediaResponse,
  PekerjaanProgressEstimasi,
  PekerjaanProgressEstimasiResponse,
  Penerima,
  Pengawas,
  PengawasStatistics,
  ProgressReportView,
  SavePekerjaanProgressEstimasiPayload,
  Tiket,
} from '@pengawas/shared'
import {
  type NotificationListResult,
  type NotificationResponse,
  parseNotificationResponse,
} from '@pengawas/shared/notifications'
import {
  type ApiClientConfig,
  createHttpTransport,
  getPaginationMeta,
  unwrapCollection,
  unwrapEntity,
} from './core'

export type KoordinatValidationResult = {
  validasi_koordinat: boolean
  validasi_koordinat_message: string
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

export function createApiClient(config: ApiClientConfig) {
  const { requestApi, requestBff } = createHttpTransport(config)

  return {
    getPaginationMeta,

    async login(input: { email: string; password: string }) {
      const payload = await requestBff<ApiEnvelope<{ user: AuthUser }>>('/auth/login', {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<AuthUser>(payload)
    },

    async syncAuthToken(token: string) {
      return requestBff('/auth/sync-token', {
        method: 'POST',
        body: { token },
      })
    },

    async exchangeHandoffCode(code: string) {
      const payload = await requestBff<ApiEnvelope<{ user: AuthUser }> | { user: AuthUser }>(
        '/auth/exchange-handoff',
        {
          method: 'POST',
          body: { code },
        },
      )

      return unwrapEntity<AuthUser>(payload)
    },

    async logout() {
      return requestBff('/auth/logout', { method: 'POST' })
    },

    async me() {
      const payload = await requestBff<ApiEnvelope<AuthUser> | AuthUser>('/auth/me')
      return unwrapEntity<AuthUser>(payload)
    },

    async getPengawasStatistics() {
      const payload = await requestApi<ApiEnvelope<PengawasStatistics>>('/pengawas/statistics')
      return unwrapEntity<PengawasStatistics>(payload)
    },

    async getDashboardStats(tahun?: string) {
      const query = new URLSearchParams()
      if (tahun) query.set('tahun', tahun)
      const payload = await requestApi<ApiEnvelope<DashboardStats>>(
        `/dashboard/stats${query.size ? `?${query}` : ''}`,
      )
      return unwrapEntity<DashboardStats>(payload)
    },

    async getPekerjaanList(params: Record<string, string | number | undefined | null> = {}) {
      const query = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== '') {
          query.set(key, `${value}`)
        }
      })

      const payload = await requestApi<PaginatedResponse<Pekerjaan> | ApiEnvelope<Pekerjaan[]>>(
        `/pekerjaan${query.size ? `?${query}` : ''}`,
      )

      return unwrapCollection<Pekerjaan>(payload)
    },

    async getPekerjaanDetail(pekerjaanId: number | string) {
      const payload = await requestApi<ApiEnvelope<PekerjaanDetail> | PekerjaanDetail>(`/pekerjaan/${pekerjaanId}`)
      return unwrapEntity<PekerjaanDetail>(payload)
    },

    async getPekerjaanMedia(pekerjaanId: number | string) {
      const payload = await requestApi<ApiEnvelope<PekerjaanMediaResponse> | PekerjaanMediaResponse>(
        `/pekerjaan/${pekerjaanId}/media`,
      )
      return unwrapEntity<PekerjaanMediaResponse>(payload)
    },

    async getPenerimaByPekerjaan(
      pekerjaanId: number | string,
      params: Record<string, string | number | undefined | null> = {},
    ) {
      const query = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== '') {
          query.set(key, `${value}`)
        }
      })

      const payload = await requestApi<PaginatedResponse<Penerima> | ApiEnvelope<Penerima[]>>(
        `/penerima/pekerjaan/${pekerjaanId}${query.size ? `?${query}` : ''}`,
      )

      return unwrapCollection<Penerima>(payload)
    },

    async createPenerima(input: {
      pekerjaan_id: number | string
      nama: string
      jumlah_jiwa?: number | string | undefined
      nik?: string | undefined
      alamat?: string | undefined
      is_komunal?: boolean
    }) {
      const payload = await requestApi<ApiEnvelope<Penerima>>('/penerima', {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<Penerima>(payload)
    },

    async updatePenerima(
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
      const payload = await requestApi<ApiEnvelope<Penerima>>(`/penerima/${penerimaId}`, {
        method: 'PUT',
        body: input,
      })

      return unwrapEntity<Penerima>(payload)
    },

    async deletePenerima(penerimaId: number | string) {
      const payload = await requestApi<ApiEnvelope<unknown>>(`/penerima/${penerimaId}`, {
        method: 'DELETE',
      })

      return unwrapEntity<unknown>(payload)
    },

    async createOutput(input: {
      pekerjaan_id: number | string
      komponen: string
      satuan?: string
      volume?: number | string | null
      penerima_is_optional?: boolean
    }) {
      const payload = await requestApi<ApiEnvelope<Output>>('/output', {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<Output>(payload)
    },

    async updateOutput(
      outputId: number | string,
      input: {
        komponen?: string
        satuan?: string
        volume?: number | string | null
        penerima_is_optional?: boolean
      },
    ) {
      const payload = await requestApi<ApiEnvelope<Output>>(`/output/${outputId}`, {
        method: 'PUT',
        body: input,
      })

      return unwrapEntity<Output>(payload)
    },

    async deleteOutput(outputId: number | string) {
      const payload = await requestApi<ApiEnvelope<unknown>>(`/output/${outputId}`, {
        method: 'DELETE',
      })

      return unwrapEntity<unknown>(payload)
    },

    async createFoto(input: FormData) {
      const payload = await requestApi<ApiEnvelope<Foto>>('/foto', {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<Foto>(payload)
    },

    async getFoto(fotoId: number | string) {
      const payload = await requestApi<ApiEnvelope<Foto> | Foto>(`/foto/${fotoId}`)
      return unwrapEntity<Foto>(payload)
    },

    async updateFoto(fotoId: number | string, input: FormData) {
      // Laravel multipart update: POST + _method=PUT
      if (!input.has('_method')) {
        input.append('_method', 'PUT')
      }
      const payload = await requestApi<ApiEnvelope<Foto>>(`/foto/${fotoId}`, {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<Foto>(payload)
    },

    async validateKoordinat(pekerjaanId: number | string, koordinat: string) {
      const payload = await requestApi<ApiEnvelope<KoordinatValidationResult> | KoordinatValidationResult>(
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
    },

    async deleteFoto(fotoId: number | string) {
      const payload = await requestApi<ApiEnvelope<unknown>>(`/foto/${fotoId}`, {
        method: 'DELETE',
      })

      return unwrapEntity<unknown>(payload)
    },

    async getProgressReport(pekerjaanId: number | string) {
      const payload = await requestApi<ApiEnvelope<ProgressReportView> | ProgressReportView>(
        `/progress/pekerjaan/${pekerjaanId}`,
      )
      return unwrapEntity<ProgressReportView>(payload)
    },

    async updateProgress(pekerjaanId: number | string, input: { items: unknown[]; week_count: number }) {
      const payload = await requestApi<ApiEnvelope<unknown>>(`/progress/pekerjaan/${pekerjaanId}`, {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<unknown>(payload)
    },

    async getPekerjaanChecklist(params: Record<string, string | number | undefined | null> = {}) {
      const query = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== '') {
          query.set(key, `${value}`)
        }
      })

      const payload = await requestApi<ChecklistMatrixResponse>(
        `/pekerjaan-checklist${query.size ? `?${query}` : ''}`,
      )
      return payload as ChecklistMatrixResponse
    },

    async togglePekerjaanChecklist(input: {
      pekerjaan_id: number | string
      checklist_item_id: number | string
      is_checked: boolean
      notes?: string | undefined
    }) {
      const payload = await requestApi<ApiEnvelope<unknown>>('/pekerjaan-checklist/toggle', {
        method: 'POST',
        body: input,
      })

      return unwrapEntity<unknown>(payload)
    },

    async getTiketList(params: Record<string, string | number | undefined | null> = {}) {
      const query = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== '') {
          query.set(key, `${value}`)
        }
      })

      const payload = await requestApi<PaginatedResponse<Tiket> | ApiEnvelope<Tiket[]>>(
        `/tiket${query.size ? `?${query}` : ''}`,
      )
      return unwrapCollection<Tiket>(payload)
    },

    async addTiketComment(tiketId: number | string, message: string) {
      const payload = await requestApi<ApiEnvelope<unknown>>(`/tiket/${tiketId}/comments`, {
        method: 'POST',
        body: { message },
      })

      return unwrapEntity<unknown>(payload)
    },

    async createTiket(input: {
      pekerjaan_id?: number | string | null
      subjek: string
      deskripsi: string
      kategori: string
      prioritas: string
      attachment?: File | Blob | null | undefined
    }) {
      const body =
        input.attachment instanceof Blob
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

      const payload = await requestApi<ApiEnvelope<unknown>>('/tiket', {
        method: 'POST',
        body,
      })

      return unwrapEntity<unknown>(payload)
    },

    async getPengawasList() {
      const payload = await requestApi<ApiEnvelope<Pengawas[]> | PaginatedResponse<Pengawas>>('/pengawas')
      return unwrapCollection<Pengawas>(payload).data
    },

    async getPekerjaanProgressEstimasi(pekerjaanId: number | string, tahun: number) {
      const query = new URLSearchParams({ tahun: String(tahun) })
      const payload = await requestApi<unknown>(`/pekerjaan/${pekerjaanId}/progress-estimasi?${query}`)
      return unwrapProgressEstimasiResponse(payload)
    },

    async savePekerjaanProgressEstimasi(
      pekerjaanId: number | string,
      input: SavePekerjaanProgressEstimasiPayload,
    ) {
      const payload = await requestApi<unknown>(`/pekerjaan/${pekerjaanId}/progress-estimasi`, {
        method: 'PUT',
        body: input,
      })

      return unwrapProgressEstimasiResponse(payload)
    },

    async getKontrakDetail(kontrakId: number | string) {
      const payload = await requestApi<ApiEnvelope<KontrakDetail> | KontrakDetail>(`/kontrak/${kontrakId}`)
      return unwrapEntity<KontrakDetail>(payload)
    },

    async getKontrakAddendumRegisterGaps(kontrakId: number | string) {
      const payload = await requestApi<
        ApiEnvelope<KontrakAddendumRegisterGapResponse> | KontrakAddendumRegisterGapResponse
      >(`/kontrak/${kontrakId}/addendum-register-gaps`)

      if (payload && typeof payload === 'object' && 'items' in payload) {
        return payload as KontrakAddendumRegisterGapResponse
      }

      return unwrapEntity<KontrakAddendumRegisterGapResponse>(payload)
    },

    async createKontrakAddendum(kontrakId: number | string, formData: FormData) {
      const payload = await requestApi<ApiEnvelope<KontrakAddendum>>(`/kontrak/${kontrakId}/addendums`, {
        method: 'POST',
        body: formData,
      })

      return unwrapEntity<KontrakAddendum>(payload)
    },

    /**
     * List berkas pekerjaan. Gunakan mine=true agar hanya file upload akun login.
     */
    async getBerkasList(params: {
      pekerjaan_id: number | string
      mine?: boolean
      per_page?: number
      page?: number
    }) {
      const search = new URLSearchParams()
      search.set('pekerjaan_id', String(params.pekerjaan_id))
      if (params.mine !== false) {
        search.set('mine', '1')
      }
      if (params.per_page != null) {
        search.set('per_page', String(params.per_page))
      }
      if (params.page != null) {
        search.set('page', String(params.page))
      }

      const payload = await requestApi<PaginatedResponse<Berkas> | ApiEnvelope<Berkas[]>>(
        `/berkas?${search.toString()}`,
      )
      return unwrapCollection<Berkas>(payload)
    },

    async createBerkas(input: FormData) {
      const payload = await requestApi<ApiEnvelope<Berkas>>('/berkas', {
        method: 'POST',
        body: input,
      })
      return unwrapEntity<Berkas>(payload)
    },

    async submitKontrakAddendum(addendumId: number | string) {
      const payload = await requestApi<ApiEnvelope<KontrakAddendum>>(`/kontrak-addendums/${addendumId}/submit`, {
        method: 'POST',
      })

      return unwrapEntity<KontrakAddendum>(payload)
    },

    async getNotifications(unreadOnly = false, page = 1): Promise<NotificationListResult> {
      const params = new URLSearchParams({
        unread_only: unreadOnly ? 'true' : 'false',
      })

      if (!unreadOnly) {
        params.set('page', String(page))
      }

      const payload = await requestApi<NotificationResponse>(`/notifications?${params.toString()}`)
      return parseNotificationResponse(payload, unreadOnly)
    },

    async markNotificationRead(id: string) {
      return requestApi<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' })
    },

    async markAllNotificationsRead() {
      return requestApi<{ message: string }>('/notifications/mark-all-read', { method: 'POST' })
    },

    async sendPresenceHeartbeat(
      app = 'pengawasan',
      options?: {
        koordinat?: string
      },
    ) {
      const body: { app: string; koordinat?: string } = { app }
      const koordinat = options?.koordinat?.trim()
      if (koordinat) {
        body.koordinat = koordinat
      }

      return requestApi<{ data: { ok: boolean; online_window_minutes: number } }>('/presence/heartbeat', {
        method: 'POST',
        body,
      })
    },

    async getPresenceOnline() {
      const payload = await requestApi<{
        data: Array<{
          id: number
          name: string
          email: string
          avatar?: string | null
          gender?: string | null
          app: string
          last_seen_at: string
          koordinat?: string | null
          koordinat_at?: string | null
        }>
        meta?: { online_window_minutes?: number }
      }>('/presence/online')

      return {
        users: Array.isArray(payload?.data) ? payload.data : [],
        onlineWindowMinutes: Number(payload?.meta?.online_window_minutes ?? 5),
      }
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>