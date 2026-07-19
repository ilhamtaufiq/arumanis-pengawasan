import { describe, expect, it } from 'bun:test'
import {
  applyAutoFill,
  applyRencanaAutofillPlan,
  buildRencanaAutofillPlan,
  detectJenisProyek,
  isSmkkRelatedText,
  type EditableItem,
  type MasterFasePekerjaan,
} from '../src/lib/rencana-autofill'

const airMinumFases: MasterFasePekerjaan[] = [
  {
    id: 1,
    jenis_proyek: 'air_minum',
    kode_fase: 'sumber_air',
    nama_fase: 'Pekerjaan Sumber Air',
    prioritas: 1,
    overlap_persen: 0,
    durasi_faktor: 1,
    keywords: ['pemboran', 'sumur'],
    is_active: true,
  },
]

describe('rencana-autofill', () => {
  it('detects air minum from SPAM keywords', () => {
    const items: EditableItem[] = [
      {
        id: 'group-1',
        uraian: 'Pekerjaan Air Minum',
        urutan: '1',
        satuan: '',
        volume: 0,
        harga_satuan: 0,
        parent_id: null,
        rencana: {},
        realisasi: {},
      },
      {
        id: 101,
        uraian: 'Pemboran sumur dalam',
        urutan: '1.1',
        satuan: 'm',
        volume: 30,
        harga_satuan: 1000,
        parent_id: 'group-1',
        rencana: {},
        realisasi: {},
      },
    ]
    expect(detectJenisProyek(items)).toBe('air_minum')
  })

  it('distributes volume evenly across scheduled weeks', () => {
    const items: EditableItem[] = [
      {
        id: 'group-air-minum',
        uraian: 'Pekerjaan Sumber Air',
        urutan: '1',
        satuan: '',
        volume: 0,
        harga_satuan: 0,
        parent_id: null,
        rencana: {},
        realisasi: {},
      },
      {
        id: 101,
        uraian: 'Pemboran sumur dalam',
        urutan: '1.1',
        satuan: 'm',
        volume: 30,
        harga_satuan: 1000,
        parent_id: 'group-air-minum',
        rencana: {},
        realisasi: {},
      },
    ]
    const scheduled = applyAutoFill(items, airMinumFases, 3)
    const row = scheduled.find((item) => item.id === 101)
    expect(row?.rencana).toEqual({ 1: 10, 2: 10, 3: 10 })
  })

  it('pins SMKK to week 1', () => {
    expect(isSmkkRelatedText('PENYELENGGARAAN SMKK')).toBe(true)
    const items: EditableItem[] = [
      {
        id: 'group-smkk',
        uraian: 'SMKK',
        urutan: '1',
        satuan: '',
        volume: 0,
        harga_satuan: 0,
        parent_id: null,
        rencana: {},
        realisasi: {},
      },
      {
        id: 'smkk-1',
        uraian: 'Induksi K3 pekerja',
        urutan: '1.1',
        satuan: 'ls',
        volume: 12,
        harga_satuan: 1000,
        parent_id: 'group-smkk',
        rencana: {},
        realisasi: {},
      },
      {
        id: 'group-pipa',
        uraian: 'Perpipaan',
        urutan: '2',
        satuan: '',
        volume: 0,
        harga_satuan: 0,
        parent_id: null,
        rencana: {},
        realisasi: {},
      },
      {
        id: 'pipa-1',
        uraian: 'Pipa PVC',
        urutan: '2.1',
        satuan: 'm',
        volume: 30,
        harga_satuan: 1000,
        parent_id: 'group-pipa',
        rencana: {},
        realisasi: {},
      },
    ]
    const scheduled = applyAutoFill(items, airMinumFases, 4)
    const smkk = scheduled.find((item) => item.id === 'smkk-1')
    expect(smkk?.rencana).toEqual({ 1: 12 })
  })

  it('maps rencana onto progress items with string week keys', () => {
    const progressItems = [
      {
        nama_item: 'Pekerjaan Sumber Air',
        rincian_item: 'Pemboran sumur dalam',
        satuan: 'm',
        target_volume: 30,
        harga_satuan: 1000,
        weekly_data: {
          '1': { rencana: 0, realisasi: 5 },
        },
      },
    ]
    const plan = buildRencanaAutofillPlan(progressItems, 3, airMinumFases)
    const result = applyRencanaAutofillPlan(progressItems, plan)
    const week1 = result.items[0]?.weekly_data?.['1']
    expect(week1?.realisasi).toBe(5)
    expect(Number(week1?.rencana ?? 0)).toBeGreaterThan(0)
    const sum = Object.values(result.items[0]?.weekly_data ?? {}).reduce(
      (s, w) => s + Number(w.rencana || 0),
      0,
    )
    expect(sum).toBeCloseTo(30, 3)
  })
})
