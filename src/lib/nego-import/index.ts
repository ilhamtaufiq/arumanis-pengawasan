import * as XLSX from 'xlsx'
import type { ProgressItem } from '@/lib/types'
import { isNegoWorkbook, parseNegoWorkbook } from './parse-nego'
import { parseNegoPdfFile } from './parse-nego-pdf'
import type { NegoParsedItem } from './types'
import { RAB_PPN_RATE } from './types'

export type { NegoParsedItem }
export { RAB_PPN_RATE }

export type NegoImportResult = {
  items: ProgressItem[]
  itemCount: number
  /** DPP = sum(volume × harga) */
  subtotalDpp: number
  /** DPP × 1.11 */
  grandTotal: number
  /** TOTAL NILAI NEGOSIASI dari PDF (jika ada) */
  pdfGrandTotal: number | null
  source: 'excel' | 'pdf'
}

function withBobot(items: NegoParsedItem[]): ProgressItem[] {
  const dppList = items.map((it) => it.volume * it.hargaSatuan * (1 + RAB_PPN_RATE))
  const total = dppList.reduce((s, v) => s + v, 0)
  return items.map((it, index) => {
    const itemValue = dppList[index] ?? 0
    const bobot = total > 0 ? Math.round((itemValue / total) * 10000) / 100 : 0
    return {
      nama_item: it.grup || 'Tanpa Kategori',
      rincian_item: it.uraian || null,
      satuan: it.satuan,
      harga_satuan: it.hargaSatuan,
      target_volume: it.volume,
      bobot,
      weekly_data: {},
    }
  })
}

function summarize(items: NegoParsedItem[]) {
  const subtotalDpp = items.reduce((s, it) => s + it.volume * it.hargaSatuan, 0)
  return {
    subtotalDpp,
    grandTotal: subtotalDpp * (1 + RAB_PPN_RATE),
  }
}

/** Import dari Excel Hasil Nego (.xlsx / .xls) */
export async function importNegoFromExcel(file: File): Promise<NegoImportResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  let parsed: NegoParsedItem[] = []
  if (isNegoWorkbook(workbook)) {
    parsed = parseNegoWorkbook(workbook)
  } else {
    // fallback: first sheet via parseNegoWorkbook (already tries first sheet)
    parsed = parseNegoWorkbook(workbook)
  }

  if (parsed.length === 0) {
    throw new Error(
      'Tidak ada item valid dari Excel. Pastikan file Hasil Nego (sheet Nego) dengan kolom Volume + Harga Negosiasi.',
    )
  }

  const { subtotalDpp, grandTotal } = summarize(parsed)
  return {
    items: withBobot(parsed),
    itemCount: parsed.length,
    subtotalDpp,
    grandTotal,
    pdfGrandTotal: null,
    source: 'excel',
  }
}

/** Import dari PDF Lampiran BA Klarifikasi/Negosiasi */
export async function importNegoFromPdf(file: File): Promise<NegoImportResult> {
  const result = await parseNegoPdfFile(file)
  if (result.items.length === 0) {
    throw new Error(
      'Tidak ada item valid dari PDF. Pastikan PDF berteks (bukan scan polos) atau gunakan Excel Hasil Nego.',
    )
  }

  const { subtotalDpp, grandTotal } = summarize(result.items)
  return {
    items: withBobot(result.items),
    itemCount: result.items.length,
    subtotalDpp,
    grandTotal: result.importGrandTotal || grandTotal,
    pdfGrandTotal: result.pdfGrandTotal,
    source: 'pdf',
  }
}

export async function importNegoFromFile(file: File): Promise<NegoImportResult> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) {
    return importNegoFromPdf(file)
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return importNegoFromExcel(file)
  }
  throw new Error('Format tidak didukung. Gunakan Excel (.xlsx) atau PDF Hasil Nego.')
}
