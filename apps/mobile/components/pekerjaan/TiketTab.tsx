import { useState } from 'react'
import { Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatApiError } from '@pengawas/api-client'
import { formatDateTime, formatNumber } from '@pengawas/shared/format'
import { queryKeys } from '@pengawas/shared/query-keys'
import { createTiket, getTiketList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  EmptyState,
  NeoBadge,
  NeoButton,
  NeoInput,
  NeoSurface,
  SectionHeader,
  Spinner,
} from '@/components/ui'
import { colors } from '@/theme/tokens'

const KATEGORI_OPTIONS = [
  { value: 'other', label: 'Umum' },
  { value: 'bug', label: 'Bug' },
  { value: 'request', label: 'Request' },
  { value: 'lapangan', label: 'Lapangan' },
  { value: 'document', label: 'Dokumen' },
] as const

const PRIORITAS_OPTIONS = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
] as const

type TiketTabProps = {
  pekerjaanId: number
}

export function TiketTab({ pekerjaanId }: TiketTabProps) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [subjek, setSubjek] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [kategori, setKategori] = useState<(typeof KATEGORI_OPTIONS)[number]['value']>('lapangan')
  const [prioritas, setPrioritas] = useState<(typeof PRIORITAS_OPTIONS)[number]['value']>('high')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const tiketQuery = useQuery({
    queryKey: queryKeys.tiket.list({ pekerjaanId }),
    queryFn: () => getTiketList({ pekerjaan_id: pekerjaanId, per_page: 20 }),
    enabled: canFetch && pekerjaanId > 0,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createTiket({
        pekerjaan_id: pekerjaanId,
        subjek: subjek.trim(),
        deskripsi: deskripsi.trim(),
        kategori,
        prioritas,
      }),
    onSuccess: async () => {
      setSubjek('')
      setDeskripsi('')
      setFormOpen(false)
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.tiket.list({ pekerjaanId }) })
    },
    onError: (error) => {
      setErrorMessage(formatApiError(error, 'Gagal membuat tiket.'))
    },
  })

  const tiketList = tiketQuery.data?.data ?? []
  const openCount = tiketList.filter((item) => `${item.status || 'open'}` !== 'closed').length

  if (tiketQuery.isLoading) {
    return <Spinner label="Memuat tiket..." />
  }

  return (
    <View style={{ gap: 16 }}>
      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <NeoBadge tone="neutral">{`Total ${formatNumber(tiketList.length)}`}</NeoBadge>
        <NeoBadge tone="warning">{`Terbuka ${formatNumber(openCount)}`}</NeoBadge>
      </View>

      <NeoSurface style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionHeader title="Buat tiket" description="Laporkan isu pekerjaan ini" />
          <NeoButton label={formOpen ? 'Tutup' : 'Form'} variant="neutral" compact onPress={() => setFormOpen((v) => !v)} />
        </View>

        {formOpen ? (
          <View style={{ gap: 12 }}>
            <NeoInput label="Subjek" value={subjek} onChangeText={setSubjek} placeholder="Ringkas masalah" />
            <NeoInput
              label="Deskripsi"
              value={deskripsi}
              onChangeText={setDeskripsi}
              placeholder="Detail lokasi / kondisi"
              multiline
            />
            <Text style={{ fontWeight: '700', fontSize: 14 }}>Kategori</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {KATEGORI_OPTIONS.map((option) => (
                <NeoButton
                  key={option.value}
                  label={option.label}
                  variant={kategori === option.value ? 'primary' : 'neutral'}
                  compact
                  onPress={() => {
                    setKategori(option.value)
                    if (option.value === 'lapangan' || option.value === 'bug') setPrioritas('high')
                  }}
                />
              ))}
            </View>
            <Text style={{ fontWeight: '700', fontSize: 14 }}>Prioritas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRIORITAS_OPTIONS.map((option) => (
                <NeoButton
                  key={option.value}
                  label={option.label}
                  variant={prioritas === option.value ? 'secondary' : 'neutral'}
                  compact
                  onPress={() => setPrioritas(option.value)}
                />
              ))}
            </View>
            <NeoButton
              label={createMutation.isPending ? 'Mengirim...' : 'Buat tiket'}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !subjek.trim() || !deskripsi.trim()}
            />
          </View>
        ) : null}
      </NeoSurface>

      <NeoSurface style={{ gap: 12 }}>
        <SectionHeader title="Daftar tiket" description={`${tiketList.length} tiket pekerjaan ini`} />
        {tiketList.length === 0 ? (
          <EmptyState title="Belum ada tiket" description="Buat tiket pertama untuk pekerjaan ini." />
        ) : (
          tiketList.map((tiket) => (
            <View
              key={tiket.id}
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                gap: 6,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 15 }}>{tiket.subjek}</Text>
              {tiket.deskripsi ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={3}>
                  {tiket.deskripsi}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <NeoBadge tone="neutral">{tiket.kategori || 'other'}</NeoBadge>
                <NeoBadge tone={tiket.prioritas === 'high' ? 'danger' : tiket.prioritas === 'medium' ? 'warning' : 'neutral'}>
                  {tiket.prioritas || 'low'}
                </NeoBadge>
                <NeoBadge tone={tiket.status === 'closed' ? 'success' : 'info'}>{tiket.status || 'open'}</NeoBadge>
              </View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{formatDateTime(tiket.created_at)}</Text>
            </View>
          ))
        )}
      </NeoSurface>
    </View>
  )
}