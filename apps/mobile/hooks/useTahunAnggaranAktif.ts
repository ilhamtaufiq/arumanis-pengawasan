import { useQuery } from '@tanstack/react-query'
import { fetchTahunAnggaranAktif } from '@/lib/app-settings'

/**
 * Tahun anggaran aktif dari pengaturan backend (www/bun / AppSetting).
 * Dipakai sebagai filter default list pekerjaan di mobile.
 */
export function useTahunAnggaranAktif(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['app-settings', 'tahun_anggaran'],
    queryFn: () => fetchTahunAnggaranAktif(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    networkMode: 'online',
  })

  return {
    tahunAktif: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
