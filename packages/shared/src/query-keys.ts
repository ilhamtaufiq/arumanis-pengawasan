export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  pengawas: {
    all: ['pengawas'] as const,
    statistics: () => [...queryKeys.pengawas.all, 'statistics'] as const,
    list: () => [...queryKeys.pengawas.all, 'list'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: (tahun?: string) => [...queryKeys.dashboard.all, 'stats', { tahun }] as const,
  },
  pekerjaan: {
    all: ['pekerjaan'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.pekerjaan.all, 'list', filters] as const,
    detail: (pekerjaanId: number | string) =>
      [...queryKeys.pekerjaan.all, 'detail', String(pekerjaanId)] as const,
    media: (pekerjaanId: number | string) =>
      [...queryKeys.pekerjaan.all, 'media', String(pekerjaanId)] as const,
    progress: (pekerjaanId: number | string) =>
      [...queryKeys.pekerjaan.all, 'progress', String(pekerjaanId)] as const,
    progressEstimasi: (pekerjaanId: number | string, tahun: number) =>
      [...queryKeys.pekerjaan.all, 'progress-estimasi', String(pekerjaanId), tahun] as const,
    penerima: (pekerjaanId: number | string, filters: Record<string, unknown> = {}) =>
      [...queryKeys.pekerjaan.all, 'penerima', String(pekerjaanId), filters] as const,
    checklist: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.pekerjaan.all, 'checklist', filters] as const,
  },
  tiket: {
    all: ['tiket'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.tiket.all, 'list', filters] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (unreadOnly: boolean, page: number) =>
      [...queryKeys.notifications.all, 'list', { unreadOnly, page }] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  fotoUploadQueue: ['foto-upload-queue'] as const,
  kontrak: {
    all: ['kontrak'] as const,
    detail: (kontrakId: number | string) =>
      [...queryKeys.kontrak.all, 'detail', kontrakId] as const,
    addendumGaps: (kontrakId: number | string) =>
      [...queryKeys.kontrak.all, 'addendum-gaps', kontrakId] as const,
  },
} as const