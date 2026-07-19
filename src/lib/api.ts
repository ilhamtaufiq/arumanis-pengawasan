import { createApiClient, createHttpTransport, type RequestOptions } from '@pengawas/api-client'

export {
  ApiError,
  formatApiError,
  unwrapEntity,
  unwrapCollection,
  getPaginationMeta,
  type KoordinatValidationResult,
  type RequestOptions,
} from '@pengawas/api-client'

const BASE = import.meta.env.BASE_URL

const webApiConfig = {
  apiPrefix: `${BASE}bff/api`,
  bffPrefix: `${BASE}bff`,
  credentials: 'include' as RequestCredentials,
  logger: {
    request(scope: 'api' | 'bff', url: string, method: string) {
      console.log(`[pengawas ${scope}] request`, { url, method })
    },
    response(scope: 'api' | 'bff', url: string, status: number, payload: unknown) {
      console.log(`[pengawas ${scope}] response`, { url, status, payload })
    },
    error(scope: 'api' | 'bff', url: string, status: number, payload: unknown) {
      console.error(`[pengawas ${scope}] error`, { url, status, payload })
    },
  },
}

const transport = createHttpTransport(webApiConfig)

export async function requestJson<T>(path: string, options: RequestOptions = {}) {
  return transport.requestApi<T>(path, options)
}

export async function requestBffJson<T>(path: string, options: RequestOptions = {}) {
  return transport.requestBff<T>(path, options)
}

const client = createApiClient(webApiConfig)

export const {
  login,
  syncAuthToken,
  exchangeHandoffCode,
  logout,
  me,
  getPengawasStatistics,
  getDashboardStats,
  getPekerjaanList,
  getPekerjaanDetail,
  getPekerjaanMedia,
  getBerkasList,
  createBerkas,
  getPenerimaByPekerjaan,
  createPenerima,
  updatePenerima,
  deletePenerima,
  createOutput,
  updateOutput,
  deleteOutput,
  createFoto,
  updateFoto,
  validateKoordinat,
  deleteFoto,
  getProgressReport,
  updateProgress,
  getMasterFasePekerjaan,
  getAppSettings,
  getPekerjaanChecklist,
  togglePekerjaanChecklist,
  getTiketList,
  addTiketComment,
  createTiket,
  getPengawasList,
  getPekerjaanProgressEstimasi,
  savePekerjaanProgressEstimasi,
  getKontrakDetail,
  getKontrakAddendumRegisterGaps,
  createKontrakAddendum,
  submitKontrakAddendum,
} = client