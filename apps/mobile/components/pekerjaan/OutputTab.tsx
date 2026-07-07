import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Output, PekerjaanDetail } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { formatNumber } from '@pengawas/shared/format'
import { queryKeys } from '@pengawas/shared/query-keys'
import { createOutput, deleteOutput, updateOutput } from '@/lib/api'
import { pickText } from '@/lib/pekerjaan-helpers'
import {
  ConfirmDialog,
  EmptyState,
  FormModal,
  NeoBadge,
  NeoChipToggle,
  NeoSelect,
  NeoButton,
  NeoInput,
  NeoSurface,
  SectionHeader,
} from '@/components/ui'
import { colors } from '@/theme/tokens'

const OUTPUT_KOMPONEN_OPTIONS = [
  'Sambungan Rumah',
  'MCK',
  'MCK Individu',
  'MCK Komunal',
  'Pipa',
  'Kran Umum',
  'Hidran Umum',
  'Broncaptering',
  'Reservoir',
  'Tangki Septik Individu',
  'Tangki Septik Komunal',
  'Sumur Bor',
  'Pompa',
] as const

const OUTPUT_SATUAN_OPTIONS = ['Unit', 'Meter', 'Meter Persegi', 'Meter Kubik'] as const

type OutputFormState = {
  komponen: string
  satuan: string
  volume: string
  penerima_is_optional: boolean
}

const EMPTY_FORM: OutputFormState = {
  komponen: '',
  satuan: '',
  volume: '',
  penerima_is_optional: false,
}

type OutputTabProps = {
  pekerjaanId: number
  pekerjaan: PekerjaanDetail
}

export function OutputTab({ pekerjaanId, pekerjaan }: OutputTabProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<OutputFormState>(EMPTY_FORM)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Output | null>(null)

  const outputList = useMemo(() => pekerjaan.output ?? [], [pekerjaan.output])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.detail(pekerjaanId) })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const komponen = form.komponen.trim()
      if (!komponen) throw new Error('Komponen wajib dipilih')

      const payload = {
        pekerjaan_id: pekerjaanId,
        komponen,
        penerima_is_optional: form.penerima_is_optional,
        satuan: form.satuan.trim() || undefined,
        volume: form.volume.trim() || undefined,
      }

      if (editingId) {
        return updateOutput(editingId, payload)
      }
      return createOutput(payload)
    },
    onSuccess: async () => {
      resetForm()
      setErrorMessage(null)
      await invalidate()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : formatApiError(error, 'Gagal menyimpan output.'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOutput(id),
    onSuccess: async () => {
      setPendingDelete(null)
      setErrorMessage(null)
      await invalidate()
    },
    onError: (error) => {
      setErrorMessage(formatApiError(error, 'Gagal menghapus output.'))
    },
  })

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(false)
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function startEdit(output: Output) {
    setEditingId(output.id)
    setForm({
      komponen: output.komponen || '',
      satuan: output.satuan || '',
      volume: output.volume != null ? String(output.volume) : '',
      penerima_is_optional: Boolean(output.penerima_is_optional),
    })
    setFormOpen(true)
  }

  return (
    <View style={{ gap: 16 }}>
      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <NeoButton label="+ Tambah komponen output" onPress={openCreateForm} fullWidth />

      <NeoSurface style={{ gap: 12 }}>
        <SectionHeader
          title="Daftar output"
          description={`${formatNumber(outputList.length)} komponen tersimpan`}
        />

        {outputList.length === 0 ? (
          <EmptyState
            title="Belum ada output"
            description="Tambahkan komponen output untuk matriks foto dan progress."
            actionLabel="Tambah output"
            onAction={openCreateForm}
          />
        ) : (
          outputList.map((output) => (
            <View
              key={output.id}
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                gap: 8,
                backgroundColor: colors.card,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontWeight: '800', fontSize: 15, flex: 1, flexShrink: 1, lineHeight: 22 }}>
                  {output.komponen}
                </Text>
                <NeoBadge tone={output.penerima_is_optional ? 'info' : 'neutral'}>
                  {output.penerima_is_optional ? 'Komunal' : 'Individu'}
                </NeoBadge>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {pickText(output.volume)} {output.satuan ?? ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <NeoButton label="Edit" variant="neutral" compact onPress={() => startEdit(output)} />
                <NeoButton
                  label="Hapus"
                  variant="danger"
                  compact
                  onPress={() => setPendingDelete(output)}
                  disabled={deleteMutation.isPending}
                />
              </View>
            </View>
          ))
        )}
      </NeoSurface>

      <FormModal
        visible={formOpen}
        title={editingId ? 'Edit output' : 'Tambah output'}
        description="Komponen pekerjaan menjadi dasar matriks foto dan progress"
        onClose={resetForm}
        footer={
          <View style={{ gap: 10 }}>
            <NeoButton
              label={saveMutation.isPending ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah output'}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.komponen.trim()}
              fullWidth
            />
            <NeoButton label="Batal" variant="neutral" onPress={resetForm} disabled={saveMutation.isPending} fullWidth />
          </View>
        }
      >
        <NeoSelect
          label="Komponen"
          value={form.komponen}
          onValueChange={(komponen) => setForm((current) => ({ ...current, komponen }))}
          placeholder="Pilih komponen"
          options={OUTPUT_KOMPONEN_OPTIONS.map((option) => ({ value: option, label: option }))}
        />

        <NeoSelect
          label="Satuan"
          value={form.satuan}
          onValueChange={(satuan) => setForm((current) => ({ ...current, satuan }))}
          placeholder="Pilih satuan"
          options={OUTPUT_SATUAN_OPTIONS.map((option) => ({ value: option, label: option }))}
        />

        <NeoInput
          label="Volume"
          value={form.volume}
          onChangeText={(volume) => setForm((current) => ({ ...current, volume }))}
          keyboardType="decimal-pad"
          placeholder="Volume"
        />

        <NeoChipToggle
          label="Komponen komunal"
          checked={form.penerima_is_optional}
          onChange={(penerima_is_optional) => setForm((current) => ({ ...current, penerima_is_optional }))}
          hint="Aktifkan untuk output kelompok tanpa penerima individu."
        />
      </FormModal>

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Hapus output"
        message={`Hapus "${pendingDelete?.komponen || 'output'}"?`}
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