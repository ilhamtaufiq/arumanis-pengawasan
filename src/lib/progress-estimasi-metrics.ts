import type { Pekerjaan } from '@/lib/types'

export function getEstimasiFisik(item: Pekerjaan) {
  return Number(item.progress_estimasi_fisik ?? 0)
}

export function getEstimasiKeuangan(item: Pekerjaan) {
  return Number(item.progress_estimasi_keuangan ?? 0)
}

export function getEstimasiFisikDeviasi(item: Pekerjaan) {
  return Number(item.deviasi_estimasi_fisik ?? 0)
}