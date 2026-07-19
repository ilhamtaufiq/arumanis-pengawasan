import {
  detectJenisProyek,
  type EditableItem,
} from './construction-scheduler'
import type { ProgressItemLike } from './types'

const LETTER_MARKER = /^[a-z]\.?$/i
const HIERARCHICAL_MARKER = /^[\d]+(?:[.,][\d]+)+$/

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function normalizeSchedulerGroupName(grup: string): string {
  if (!grup || grup === 'Tanpa Kategori') return grup

  const parts = grup
    .split(' › ')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !LETTER_MARKER.test(part))
    .filter((part) => !HIERARCHICAL_MARKER.test(part))

  return parts[0] || grup.trim()
}

export function buildSchedulerItems(items: ProgressItemLike[]): EditableItem[] {
  const schedulerItems: EditableItem[] = []
  const seenGroups = new Set<string>()

  items.forEach((item, index) => {
    const rawGroupName = item.nama_item || 'Tanpa Kategori'
    const groupName = normalizeSchedulerGroupName(rawGroupName)
    const itemId = item.id ?? `item-${index}`
    const groupId = `group-${groupName}`

    if (!seenGroups.has(groupName)) {
      seenGroups.add(groupName)
      schedulerItems.push({
        id: groupId,
        urutan: String(schedulerItems.length + 1),
        uraian: groupName,
        satuan: '',
        volume: 0,
        harga_satuan: 0,
        parent_id: null,
        rencana: {},
        realisasi: {},
      })
    }

    schedulerItems.push({
      id: itemId,
      urutan: `${groupName}-${index + 1}`,
      uraian: item.rincian_item || groupName,
      satuan: item.satuan || '-',
      volume: toNumber(item.target_volume),
      harga_satuan: toNumber(item.harga_satuan),
      parent_id: groupId,
      rencana: {},
      realisasi: {},
    })
  })

  return schedulerItems
}

export function detectProjectTypeFromProgressItems(items: ProgressItemLike[]): string {
  const schedulerItems = buildSchedulerItems(items)
  const groupContext = items
    .map((item) => `${normalizeSchedulerGroupName(item.nama_item || '')} ${item.rincian_item || ''}`)
    .join(' ')

  return detectJenisProyek([
    ...schedulerItems,
    {
      id: 'context',
      urutan: '0',
      uraian: groupContext,
      satuan: '',
      volume: 0,
      harga_satuan: 0,
      parent_id: null,
      rencana: {},
      realisasi: {},
    },
  ])
}

/**
 * Terapkan rencana terjadwal ke item progress.
 * - Key weekly_data pakai string ("1", "2", …) sesuai kontrak pengawas.
 * - Realisasi yang sudah ada dipertahankan.
 */
export function applyScheduledRencanaToProgressItems<T extends ProgressItemLike>(
  items: T[],
  scheduledItems: EditableItem[],
  weekCount: number,
): T[] {
  const next = items.map((item) => ({
    ...item,
    weekly_data: { ...(item.weekly_data ?? {}) },
  }))

  scheduledItems.forEach((schedItem) => {
    const scheduledItemId = String(schedItem.id)
    if (scheduledItemId.startsWith('group-')) return

    const idx = next.findIndex(
      (item, index) => String(item.id ?? `item-${index}`) === scheduledItemId,
    )
    if (idx === -1) return

    const current = next[idx]
    if (!current) return

    const currentWeekly: NonNullable<ProgressItemLike['weekly_data']> = {
      ...(current.weekly_data ?? {}),
    }

    for (let week = 1; week <= weekCount; week += 1) {
      const key = String(week)
      const existing = currentWeekly[key] ?? {}
      currentWeekly[key] = {
        rencana: 0,
        realisasi: existing.realisasi ?? null,
      }
    }

    if (schedItem.rencana) {
      for (const [weekKey, value] of Object.entries(schedItem.rencana)) {
        const key = String(weekKey)
        const existing = currentWeekly[key] ?? {}
        currentWeekly[key] = {
          rencana: value as number,
          realisasi: existing.realisasi ?? null,
        }
      }
    }

    next[idx] = {
      ...current,
      weekly_data: currentWeekly,
    }
  })

  return next
}
