import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Penerima, PekerjaanDetail } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { formatDateTime } from '@pengawas/shared/format'
import { queryKeys } from '@pengawas/shared/query-keys'
import { createPenerima, deletePenerima, getPenerimaByPekerjaan, updatePenerima } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { pickText } from '@/lib/pekerjaan-helpers'
import { DEFAULT_PAGE_SIZE, paginateSlice, readPaginationMeta } from '@/lib/pagination'
import {
  ConfirmDialog,
  EmptyState,
  NeoBadge,
  NeoButton,
  NeoInput,
  NeoSurface,
  PaginationBar,
  SectionHeader,
  Spinner,
} from '@/components/ui'
import { colors } from '@/theme/tokens'

type PenerimaFormState = {
  nama: string
  jumlah_jiwa: string
  nik: string
  alamat: string
  is_komunal: boolean
}

const EMPTY_FORM: PenerimaFormState = {
  nama: '',
  jumlah_jiwa: '',
  nik: '',
  alamat: '',
  is_komunal: false,
}

type PenerimaTabProps = {
  pekerjaanId: number
  pekerjaan: PekerjaanDetail
}

export function PenerimaTab({ pekerjaanId, pekerjaan }: PenerimaTabProps) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PenerimaFormState>(EMPTY_FORM)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Penerima | null>(null)

  const fallbackList = pekerjaan.penerima ?? []

  const penerimaQuery = useQuery({
    queryKey: queryKeys.pekerjaan.penerima(pekerjaanId, { page, per_page: DEFAULT_PAGE_SIZE }),
    queryFn: () => getPenerimaByPekerjaan(pekerjaanId, { page, per_page: DEFAULT_PAGE_SIZE }),
    enabled: canFetch && pekerjaanId > 0,
    retry: false,
  })

  const { pageItems, pagination } = useMemo(() => {
    const responseItems = penerimaQuery.data?.data
    const responseMeta = penerimaQuery.data?.meta as Record<string, unknown> | undefined
    const hasServerMeta = Boolean(
      responseMeta && (responseMeta.current_page != null || responseMeta.last_page != null || responseMeta.total != null),
    )

    if (hasServerMeta && responseItems) {
      const meta = readPaginationMeta(responseMeta, {
        page,
        perPage: DEFAULT_PAGE_SIZE,
        total: responseItems.length,
      })
      return { pageItems: responseItems, pagination: meta }
    }

    const source = responseItems?.length ? responseItems : fallbackList
    const meta = readPaginationMeta(undefined, {
      page,
      perPage: DEFAULT_PAGE_SIZE,
      total: source.length,
    })
    return {
      pageItems: paginateSlice(source, page, DEFAULT_PAGE_SIZE),
      pagination: meta,
    }
  }, [fallbackList, page, penerimaQuery.data?.data, penerimaQuery.data?.meta])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.penerima(pekerjaanId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.detail(pekerjaanId) }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nama.trim()) throw new Error('Nama wajib diisi')
      if (!form.is_komunal) {
        if (!form.jumlah_jiwa.trim() || !form.nik.trim()) {
          throw new Error('Jumlah jiwa dan NIK wajib diisi untuk penerima individu')
        }
      }

      const payload = {
        pekerjaan_id: pekerjaanId,
        nama: form.nama.trim(),
        alamat: form.alamat.trim() || undefined,
        is_komunal: form.is_komunal,
        jumlah_jiwa: form.is_komunal ? undefined : form.jumlah_jiwa.trim(),
        nik: form.is_komunal ? undefined : form.nik.trim(),
      }

      if (editingId) {
        return updatePenerima(editingId, payload)
      }
      return createPenerima(payload)
    },
    onSuccess: async () => {
      resetForm()
      setErrorMessage(null)
      setPage(1)
      await invalidate()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : formatApiError(error, 'Gagal menyimpan penerima.'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePenerima(id),
    onSuccess: async () => {
      setPendingDelete(null)
      setErrorMessage(null)
      if (pageItems.length <= 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1))
      }
      await invalidate()
    },
    onError: (error) => {
      setErrorMessage(formatApiError(error, 'Gagal menghapus penerima.'))
    },
  })

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(false)
  }

  function startEdit(penerima: Penerima) {
    setEditingId(penerima.id)
    setForm({
      nama: penerima.nama || '',
      jumlah_jiwa: penerima.jumlah_jiwa != null ? String(penerima.jumlah_jiwa) : '',
      nik: penerima.nik || '',
      alamat: penerima.alamat || '',
      is_komunal: Boolean(penerima.is_komunal),
    })
    setFormOpen(true)
  }

  function requestDelete(penerima: Penerima) {
    setPendingDelete(penerima)
  }

  const listBusy = penerimaQuery.isLoading || deleteMutation.isPending

  return (
    <View style={{ gap: 16 }}>
      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <NeoSurface style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <SectionHeader
            title={editingId ? 'Edit penerima' : 'Tambah penerima'}
            description="Komunal = tanpa NIK/jumlah jiwa"
          />
          {!editingId ? (
            <NeoButton
              label={formOpen ? 'Tutup' : 'Form'}
              variant="neutral"
              compact
              onPress={() => setFormOpen((open) => !open)}
            />
          ) : null}
        </View>

        {formOpen || editingId ? (
          <View style={{ gap: 12 }}>
            <NeoInput
              label="Nama"
              value={form.nama}
              onChangeText={(nama) => setForm((current) => ({ ...current, nama }))}
              placeholder="Nama penerima"
            />
            <NeoInput
              label="Jumlah jiwa"
              value={form.jumlah_jiwa}
              onChangeText={(jumlah_jiwa) => setForm((current) => ({ ...current, jumlah_jiwa }))}
              keyboardType="number-pad"
              editable={!form.is_komunal}
              placeholder="0"
            />
            <NeoInput
              label="NIK"
              value={form.nik}
              onChangeText={(nik) => setForm((current) => ({ ...current, nik }))}
              editable={!form.is_komunal}
              placeholder="NIK"
            />
            <NeoInput
              label="Alamat"
              value={form.alamat}
              onChangeText={(alamat) => setForm((current) => ({ ...current, alamat }))}
              placeholder="Alamat singkat"
              multiline
            />
            <Pressable
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  is_komunal: !current.is_komunal,
                  jumlah_jiwa: !current.is_komunal ? '' : current.jumlah_jiwa,
                  nik: !current.is_komunal ? '' : current.nik,
                }))
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: form.is_komunal ? colors.info : colors.card,
              }}
            >
              <Text style={{ fontWeight: '700' }}>{form.is_komunal ? '✓ Komunal' : 'Komunal'}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NeoButton
                label={saveMutation.isPending ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              />
              <NeoButton label="Batal" variant="neutral" onPress={resetForm} />
            </View>
          </View>
        ) : null}
      </NeoSurface>

      <NeoSurface style={{ gap: 12 }}>
        <SectionHeader
          title="Daftar penerima"
          description={`${pagination.total} tersimpan · ${DEFAULT_PAGE_SIZE} per halaman`}
        />

        {penerimaQuery.isLoading ? <Spinner label="Memuat penerima..." /> : null}

        {!penerimaQuery.isLoading && pageItems.length === 0 ? (
          <EmptyState title="Belum ada penerima" description="Tambahkan penerima manfaat pertama." />
        ) : null}

        {pageItems.map((penerima) => (
          <View
            key={penerima.id}
            style={{
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: 6,
              padding: 12,
              gap: 8,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontWeight: '800', fontSize: 15, flex: 1, flexShrink: 1, lineHeight: 22 }}>
                {penerima.nama}
              </Text>
              <NeoBadge tone={penerima.is_komunal ? 'info' : 'neutral'}>
                {penerima.is_komunal ? 'Komunal' : 'Individu'}
              </NeoBadge>
            </View>
            {!penerima.is_komunal ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Jiwa {pickText(penerima.jumlah_jiwa)} · NIK {pickText(penerima.nik)}
              </Text>
            ) : null}
            {penerima.alamat ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20, flexShrink: 1 }}>
                {penerima.alamat}
              </Text>
            ) : null}
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {formatDateTime(penerima.created_at)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NeoButton label="Edit" variant="neutral" compact onPress={() => startEdit(penerima)} />
              <NeoButton
                label="Hapus"
                variant="danger"
                compact
                onPress={() => requestDelete(penerima)}
                disabled={deleteMutation.isPending}
              />
            </View>
          </View>
        ))}

        <PaginationBar
          currentPage={pagination.currentPage}
          lastPage={pagination.lastPage}
          total={pagination.total}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(pagination.lastPage, current + 1))}
          disabled={listBusy}
        />
      </NeoSurface>

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Hapus penerima"
        message={`Hapus "${pendingDelete?.nama || 'penerima'}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return
          deleteMutation.mutate(pendingDelete.id)
        }}
        onCancel={() => {
          if (deleteMutation.isPending) return
          setPendingDelete(null)
        }}
        isBusy={deleteMutation.isPending}
      />
    </View>
  )
}