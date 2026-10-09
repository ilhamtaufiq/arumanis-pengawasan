import { createApiClient, createHttpTransport, type RequestOptions } from '@pengawas/api-client'
import { APIAMIS_BASE_URL } from '@/lib/config'

export {
  ApiError,
  formatApiError,
  unwrapEntity,
  unwrapCollection,
  getPaginationMeta,
  type KoordinatValidationResult,
  type RequestOptions,
} from '@pengawas/api-client'

const webApiConfig = {
  apiPrefix: APIAMIS_BASE_URL,
  credentials: 'include' as RequestCredentials,
  logger: {
    request(url: string, method: string) {
      console.log('[pengawas api] request', { url, method })
    },
    response(url: string, status: number, payload: unknown) {
      console.log('[pengawas api] response', { url, status, payload })
    },
    error(url: string, status: number, payload: unknown) {
      console.error('[pengawas api] error', { url, status, payload })
    },
  },
}

const transport = createHttpTransport(webApiConfig)

export async function requestJson<T>(path: string, options: RequestOptions = {}) {
  return transport.requestApi<T>(path, options)
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
  getBerkasJenisDokumen,
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
  updateKontrakAddendum,
  submitKontrakAddendum,
  deleteKontrakAddendum,
  getDocumentRegistersByAddendum,
  uploadKontrakAddendum,
  generateAddendumNumbers,
} = client