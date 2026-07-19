import {
  applyAutoFill,
  calculateSchedule,
  type ScheduledGroup,
} from './construction-scheduler'
import {
  applyScheduledRencanaToProgressItems,
  buildSchedulerItems,
  detectProjectTypeFromProgressItems,
} from './bridge'
import { defaultFasesForJenis } from './default-fases'
import type { MasterFasePekerjaan, ProgressItemLike } from './types'

export type { MasterFasePekerjaan, ProgressItemLike } from './types'
export type { ScheduledGroup, EditableItem } from './construction-scheduler'
export {
  applyAutoFill,
  calculateSchedule,
  detectJenisProyek,
  distributeVolume,
  isSmkkRelatedText,
} from './construction-scheduler'
export {
  applyScheduledRencanaToProgressItems,
  buildSchedulerItems,
  detectProjectTypeFromProgressItems,
  normalizeSchedulerGroupName,
} from './bridge'
export { DEFAULT_MASTER_FASES, defaultFasesForJenis } from './default-fases'

export type RencanaAutofillPlan = {
  projectType: string
  weekCount: number
  previewGroups: ScheduledGroup[]
  masterFases: MasterFasePekerjaan[]
  usedFallbackFases: boolean
}

export type RencanaAutofillResult<T extends ProgressItemLike> = {
  items: T[]
  projectType: string
  weekCount: number
  usedFallbackFases: boolean
}

/** Pilih fase: API dulu, fallback seeder lokal. */
export function resolveMasterFases(
  projectType: string,
  fromApi: MasterFasePekerjaan[] | null | undefined,
): { fases: MasterFasePekerjaan[]; usedFallback: boolean } {
  const filtered = (fromApi ?? []).filter(
    (f) => f.is_active !== false && (!projectType || f.jenis_proyek === projectType),
  )
  if (filtered.length > 0) {
    return { fases: filtered, usedFallback: false }
  }
  // coba semua dari API tanpa filter jenis
  const anyActive = (fromApi ?? []).filter((f) => f.is_active !== false)
  if (anyActive.length > 0) {
    return { fases: anyActive, usedFallback: false }
  }
  return { fases: defaultFasesForJenis(projectType || 'sanitasi'), usedFallback: true }
}

export function buildRencanaAutofillPlan(
  items: ProgressItemLike[],
  weekCount: number,
  masterFasesFromApi?: MasterFasePekerjaan[] | null,
): RencanaAutofillPlan {
  const projectType = detectProjectTypeFromProgressItems(items)
  const { fases, usedFallback } = resolveMasterFases(projectType, masterFasesFromApi)
  const schedulerItems = buildSchedulerItems(items)
  const previewGroups = calculateSchedule(schedulerItems, fases, weekCount).filter(
    (g) => g.items.length > 0,
  )

  return {
    projectType,
    weekCount,
    previewGroups,
    masterFases: fases,
    usedFallbackFases: usedFallback,
  }
}

export function applyRencanaAutofillPlan<T extends ProgressItemLike>(
  items: T[],
  plan: RencanaAutofillPlan,
): RencanaAutofillResult<T> {
  const schedulerItems = buildSchedulerItems(items)
  const scheduled = applyAutoFill(schedulerItems, plan.masterFases, plan.weekCount)
  const nextItems = applyScheduledRencanaToProgressItems(items, scheduled, plan.weekCount)

  return {
    items: nextItems,
    projectType: plan.projectType,
    weekCount: plan.weekCount,
    usedFallbackFases: plan.usedFallbackFases,
  }
}
