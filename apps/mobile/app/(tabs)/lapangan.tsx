import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import type { Pekerjaan } from '@pengawas/shared'
import { formatDateTime } from '@pengawas/shared/format'
import { getDesaName, getKecamatanName } from '@pengawas/shared/wilayah-fields'
import { ApiError } from '@pengawas/api-client'
import { getPekerjaanDetail } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useIsOnline } from '@/hooks/useIsOnline'
import {
  buildKegiatanCaption,
  deleteKegiatanLapanganDraft,
  draftToStoryMeta,
  extractKegiatanContext,
  listKegiatanLapanganDrafts,
  saveKegiatanLapanganDraft,
  type KegiatanLapanganDraft,
  type KegiatanPekerjaanContext,
} from '@/lib/kegiatan-lapangan'
import { copyStoryCaption } from '@/lib/story-share'
import { PekerjaanPickerModal } from '@/components/kegiatan-lapangan/PekerjaanPickerModal'
import { KegiatanStoryPreviewModal } from '@/components/kegiatan-lapangan/KegiatanStoryPreviewModal'
import {
  ChoiceDialog,
  EmptyState,
  NeoBadge,
  NeoButton,
  NeoInput,
  NeoSurface,
  SectionHeader,
  Spinner,
} from '@/components/ui'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'
import { colors, radius, shadows } from '@/theme/tokens'

export const ErrorBoundary = createRouteErrorBoundary('Kegiatan lapangan')

/** Aksen form Lapangan selaras logo Bidang AMS */
const AMS_BLUE = '#1565C0'
const AMS_SOFT = '#E3F2FD'

type FormState = {
  id?: string
  namaKegiatan: string
  keterangan: string
  photoUri: string
  context: KegiatanPekerjaanContext | null
  caption: string
  koordinat: string
}

const emptyForm = (): FormState => ({
  namaKegiatan: '',
  keterangan: '',
  photoUri: '',
  context: null,
  caption: '',
  koordinat: '',
})

export default function LapanganScreen() {
  const { canFetch, user } = useAuth()
  const isOnline = useIsOnline()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [drafts, setDrafts] = useState<KegiatanLapanganDraft[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const refreshDrafts = useCallback(async () => {
    setLoadingDrafts(true)
    try {
      const items = await listKegiatanLapanganDrafts()
      setDrafts(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat draft tersimpan.')
    } finally {
      setLoadingDrafts(false)
    }
  }, [])

  useEffect(() => {
    void refreshDrafts()
  }, [refreshDrafts])

  const regenerateCaption = useCallback(
    (args: {
      namaKegiatan: string
      keterangan: string
      ctx: KegiatanPekerjaanContext | null
      koordinat: string
    }) => {
      if (!args.ctx) return ''
      return buildKegiatanCaption({
        namaKegiatan: args.namaKegiatan,
        namaPaket: args.ctx.namaPaket,
        desa: args.ctx.desa,
        kecamatan: args.ctx.kecamatan,
        outputLine: args.ctx.outputLine,
        outcomeLine: args.ctx.outcomeLine,
        pengawas: args.ctx.pengawas ?? user?.name ?? null,
        koordinat: args.koordinat || null,
        tahunAnggaran: args.ctx.tahunAnggaran,
        keterangan: args.keterangan || null,
      })
    },
    [user?.name],
  )

  const applyContext = useCallback(
    (ctx: KegiatanPekerjaanContext) => {
      setForm((prev) => {
        const caption = regenerateCaption({
          namaKegiatan: prev.namaKegiatan,
          keterangan: prev.keterangan,
          ctx,
          koordinat: prev.koordinat,
        })
        return { ...prev, context: ctx, caption }
      })
    },
    [regenerateCaption],
  )

  const handleSelectPekerjaan = useCallback(
    async (item: Pekerjaan) => {
      setPickerOpen(false)
      setError(null)
      setDetailLoading(true)
      try {
        const quick: KegiatanPekerjaanContext = {
          pekerjaanId: item.id,
          namaPaket: item.nama_paket,
          desa: getDesaName(item.desa) || null,
          kecamatan: getKecamatanName(item.kecamatan) || null,
          outputLine: null,
          outcomeLine: item.kegiatan
            ? [item.kegiatan.nama_kegiatan, item.kegiatan.nama_sub_kegiatan]
                .filter(Boolean)
                .join(' · ') || null
            : null,
          pengawas: item.pengawas?.nama ?? user?.name ?? null,
          tahunAnggaran: item.kegiatan?.tahun_anggaran ?? null,
        }
        applyContext(quick)

        if (!canFetch || !isOnline) {
          setInfo('Mode offline: detail output belum dimuat. Caption memakai data list.')
          return
        }

        const detail = await getPekerjaanDetail(item.id)
        const full = extractKegiatanContext(detail)
        if (!full.pengawas && user?.name) full.pengawas = user.name
        applyContext(full)
        setInfo(null)
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Gagal memuat detail pekerjaan.'
        setError(msg)
      } finally {
        setDetailLoading(false)
      }
    },
    [applyContext, canFetch, isOnline, user?.name],
  )

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    setSourceOpen(false)
    setError(null)
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          setError('Izin kamera ditolak.')
          return
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          setError('Izin galeri ditolak.')
          return
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.92,
        allowsEditing: false,
        exif: true,
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options)

      if (result.canceled || !result.assets[0]?.uri) return
      const uri = result.assets[0].uri
      setForm((prev) => ({ ...prev, photoUri: uri }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memilih foto.')
    }
  }, [])

  const handleSave = useCallback(async () => {
    setError(null)
    setInfo(null)
    if (!form.namaKegiatan.trim()) {
      setError('Isi nama kegiatan lapangan dulu (contoh: Monitoring dan Evaluasi).')
      return
    }
    if (!form.photoUri) {
      setError('Ambil atau pilih foto terlebih dahulu.')
      return
    }
    if (!form.context) {
      setError('Pilih paket pekerjaan (lokasi).')
      return
    }
    if (!form.caption.trim()) {
      setError('Caption tidak boleh kosong. Ketuk Generate ulang jika kosong.')
      return
    }

    setBusy(true)
    try {
      const saved = await saveKegiatanLapanganDraft({
        id: form.id,
        namaKegiatan: form.namaKegiatan,
        keterangan: form.keterangan,
        photoUri: form.photoUri,
        pekerjaanId: form.context.pekerjaanId,
        namaPaket: form.context.namaPaket,
        desa: form.context.desa,
        kecamatan: form.context.kecamatan,
        outputLine: form.context.outputLine,
        outcomeLine: form.context.outcomeLine,
        pengawas: form.context.pengawas ?? user?.name ?? null,
        tahunAnggaran: form.context.tahunAnggaran,
        koordinat: form.koordinat.trim() || null,
        caption: form.caption,
      })
      setForm((prev) => ({ ...prev, id: saved.id }))
      setInfo('Draft kegiatan disimpan di perangkat.')
      await refreshDrafts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan draft.')
    } finally {
      setBusy(false)
    }
  }, [form, refreshDrafts, user?.name])

  const handleCopyCaption = useCallback(async () => {
    if (!form.caption.trim()) return
    try {
      await copyStoryCaption(form.caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyalin caption.')
    }
  }, [form.caption])

  const handleLoadDraft = useCallback((draft: KegiatanLapanganDraft) => {
    setError(null)
    setInfo(`Draft dimuat: ${draft.namaKegiatan || draft.namaPaket}`)
    setForm({
      id: draft.id,
      namaKegiatan: draft.namaKegiatan || '',
      keterangan: draft.keterangan || '',
      photoUri: draft.photoUri,
      caption: draft.caption,
      koordinat: draft.koordinat ?? '',
      context: {
        pekerjaanId: draft.pekerjaanId,
        namaPaket: draft.namaPaket,
        desa: draft.desa,
        kecamatan: draft.kecamatan,
        outputLine: draft.outputLine,
        outcomeLine: draft.outcomeLine,
        pengawas: draft.pengawas,
        tahunAnggaran: draft.tahunAnggaran,
      },
    })
  }, [])

  const handleDeleteDraft = useCallback(
    async (id: string) => {
      setBusy(true)
      try {
        await deleteKegiatanLapanganDraft(id)
        if (form.id === id) setForm(emptyForm())
        await refreshDrafts()
        setInfo('Draft dihapus.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal menghapus draft.')
      } finally {
        setBusy(false)
      }
    },
    [form.id, refreshDrafts],
  )

  const previewMeta = useMemo(() => {
    if (!form.photoUri || !form.context || !form.namaKegiatan.trim()) return null
    const draftLike: KegiatanLapanganDraft = {
      id: form.id || 'preview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photoUri: form.photoUri,
      namaKegiatan: form.namaKegiatan,
      keterangan: form.keterangan || null,
      pekerjaanId: form.context.pekerjaanId,
      namaPaket: form.context.namaPaket,
      desa: form.context.desa,
      kecamatan: form.context.kecamatan,
      outputLine: form.context.outputLine,
      outcomeLine: form.context.outcomeLine,
      pengawas: form.context.pengawas ?? user?.name ?? null,
      tahunAnggaran: form.context.tahunAnggaran,
      koordinat: form.koordinat || null,
      caption: form.caption,
    }
    return draftToStoryMeta(draftLike)
  }, [form, user?.name])

  const locLabel = form.context
    ? [form.context.desa, form.context.kecamatan].filter(Boolean).join(' · ') || 'Lokasi tidak diisi'
    : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: radius,
            backgroundColor: AMS_SOFT,
            padding: 12,
            ...shadows.sm,
          }}
        >
          <SectionHeader
            title="Kegiatan lapangan"
            description="Isi nama kegiatan dulu, lalu foto + paket pekerjaan. Simpan draft, preview, bagikan story."
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <NeoBadge tone={isOnline ? 'success' : 'danger'}>
            {isOnline ? 'Online' : 'Offline'}
          </NeoBadge>
          <NeoBadge tone="neutral">Draft lokal</NeoBadge>
          <NeoBadge tone="info">@bidang_ams</NeoBadge>
          {form.id ? <NeoBadge tone="info">Edit draft</NeoBadge> : null}
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 2,
              borderColor: '#dc2626',
              borderRadius: radius,
              padding: 10,
            }}
          >
            <Text style={{ fontWeight: '700', color: '#7f1d1d', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {info ? (
          <View
            style={{
              backgroundColor: '#ecfdf5',
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: radius,
              padding: 10,
            }}
          >
            <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: 13 }}>{info}</Text>
          </View>
        ) : null}

        {/* Nama kegiatan — dinamis */}
        <NeoSurface style={{ gap: 10, borderColor: AMS_BLUE }}>
          <Text style={{ fontWeight: '900', fontSize: 15, color: AMS_BLUE }}>
            1. Nama kegiatan lapangan
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
            Judul di header story. Contoh: Monitoring dan Evaluasi, Provisional Hand Over, dll.
          </Text>
          <NeoInput
            label="Nama kegiatan *"
            value={form.namaKegiatan}
            onChangeText={(text) => {
              setForm((prev) => {
                const next = { ...prev, namaKegiatan: text }
                if (prev.context) {
                  next.caption = regenerateCaption({
                    namaKegiatan: text,
                    keterangan: prev.keterangan,
                    ctx: prev.context,
                    koordinat: prev.koordinat,
                  })
                }
                return next
              })
            }}
            placeholder="Monitoring dan Evaluasi"
            autoCorrect
          />
          <NeoInput
            label="Keterangan (opsional)"
            value={form.keterangan}
            onChangeText={(text) => {
              setForm((prev) => {
                const next = { ...prev, keterangan: text }
                if (prev.context) {
                  next.caption = regenerateCaption({
                    namaKegiatan: prev.namaKegiatan,
                    keterangan: text,
                    ctx: prev.context,
                    koordinat: prev.koordinat,
                  })
                }
                return next
              })
            }}
            placeholder="Catatan lapangan, temuan, dll."
            multiline
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
        </NeoSurface>

        {/* Foto */}
        <NeoSurface style={{ gap: 10 }}>
          <Text style={{ fontWeight: '900', fontSize: 15 }}>2. Foto</Text>
          {form.photoUri ? (
            <View
              style={{
                height: 200,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                overflow: 'hidden',
                backgroundColor: colors.muted,
                ...shadows.sm,
              }}
            >
              <Image
                source={{ uri: form.photoUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View
              style={{
                height: 120,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.mutedForeground }}>
                Belum ada foto
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <NeoButton label="Ambil / pilih foto" variant="primary" onPress={() => setSourceOpen(true)} />
            {form.photoUri ? (
              <NeoButton
                label="Hapus foto"
                variant="ghost"
                onPress={() => setForm((p) => ({ ...p, photoUri: '' }))}
              />
            ) : null}
          </View>
        </NeoSurface>

        {/* Lokasi / paket */}
        <NeoSurface style={{ gap: 10 }}>
          <Text style={{ fontWeight: '900', fontSize: 15 }}>3. Lokasi (paket pekerjaan)</Text>
          {form.context ? (
            <View
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.card,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ fontWeight: '900', fontSize: 14 }}>{form.context.namaPaket}</Text>
              {locLabel ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
                  {locLabel}
                </Text>
              ) : null}
              {form.context.outcomeLine ? (
                <Text style={{ fontSize: 12, fontWeight: '700' }}>
                  Outcome: {form.context.outcomeLine}
                </Text>
              ) : null}
              {form.context.outputLine ? (
                <Text style={{ fontSize: 12, fontWeight: '700' }}>
                  Output: {form.context.outputLine}
                </Text>
              ) : (
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  Output: (belum ada / belum dimuat)
                </Text>
              )}
              {detailLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <ActivityIndicator size="small" color={colors.foreground} />
                  <Text style={{ fontSize: 12, fontWeight: '700' }}>Memuat detail output…</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              Belum memilih paket. Ketuk tombol di bawah untuk mencari.
            </Text>
          )}
          <NeoButton
            label={form.context ? 'Ganti paket pekerjaan' : 'Cari & pilih paket'}
            variant="secondary"
            onPress={() => setPickerOpen(true)}
            disabled={!canFetch}
          />
          {!isOnline ? (
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
              Offline: pencarian paket membutuhkan koneksi.
            </Text>
          ) : null}
        </NeoSurface>

        {/* Caption */}
        <NeoSurface style={{ gap: 10 }}>
          <Text style={{ fontWeight: '900', fontSize: 15 }}>4. Caption</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
            Otomatis dari nama kegiatan, paket, output/outcome, keterangan. Bisa diedit lalu di-copy.
          </Text>
          <NeoInput
            value={form.caption}
            onChangeText={(text) => setForm((p) => ({ ...p, caption: text }))}
            multiline
            style={{ minHeight: 140, textAlignVertical: 'top' }}
            placeholder="Caption story…"
          />
          <NeoInput
            label="Koordinat (opsional)"
            value={form.koordinat}
            onChangeText={(text) => {
              setForm((p) => {
                const next = { ...p, koordinat: text }
                if (p.context) {
                  next.caption = regenerateCaption({
                    namaKegiatan: p.namaKegiatan,
                    keterangan: p.keterangan,
                    ctx: p.context,
                    koordinat: text,
                  })
                }
                return next
              })
            }}
            placeholder="-6.8, 107.1"
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <NeoButton
              label={copied ? 'Disalin ✓' : 'Salin caption'}
              variant="neutral"
              onPress={() => void handleCopyCaption()}
              disabled={!form.caption.trim()}
            />
            <NeoButton
              label="Generate ulang"
              variant="ghost"
              onPress={() => {
                if (!form.context) {
                  setError('Pilih paket dulu untuk generate caption.')
                  return
                }
                if (!form.namaKegiatan.trim()) {
                  setError('Isi nama kegiatan dulu.')
                  return
                }
                setForm((p) => ({
                  ...p,
                  caption: regenerateCaption({
                    namaKegiatan: p.namaKegiatan,
                    keterangan: p.keterangan,
                    ctx: p.context,
                    koordinat: p.koordinat,
                  }),
                }))
              }}
              disabled={!form.context}
            />
          </View>
        </NeoSurface>

        {/* Aksi */}
        <NeoSurface style={{ gap: 10 }}>
          <Text style={{ fontWeight: '900', fontSize: 15 }}>5. Simpan · Preview · Share</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <NeoButton
              label={busy ? 'Menyimpan…' : form.id ? 'Update draft' : 'Simpan draft'}
              variant="primary"
              onPress={() => void handleSave()}
              disabled={busy}
            />
            <NeoButton
              label="Preview story"
              variant="secondary"
              onPress={() => {
                if (!form.namaKegiatan.trim()) {
                  setError('Isi nama kegiatan sebelum preview.')
                  return
                }
                if (!form.photoUri || !form.context) {
                  setError('Isi foto dan pilih paket sebelum preview.')
                  return
                }
                setPreviewOpen(true)
              }}
              disabled={!form.photoUri || !form.context || !form.namaKegiatan.trim()}
            />
            <NeoButton
              label="Form baru"
              variant="ghost"
              onPress={() => {
                setForm(emptyForm())
                setInfo(null)
                setError(null)
              }}
            />
          </View>
        </NeoSurface>

        {/* Draft list */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: '900', fontSize: 16 }}>Draft tersimpan</Text>
          {loadingDrafts ? <Spinner label="Memuat draft…" /> : null}
          {!loadingDrafts && drafts.length === 0 ? (
            <EmptyState
              title="Belum ada draft"
              description="Simpan kegiatan lapangan agar bisa dibuka lagi offline."
            />
          ) : null}
          {drafts.map((draft) => (
            <Pressable
              key={draft.id}
              onPress={() => handleLoadDraft(draft)}
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: form.id === draft.id ? AMS_SOFT : colors.card,
                padding: 12,
                gap: 6,
                ...shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {draft.photoUri ? (
                  <Image
                    source={{ uri: draft.photoUri }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: colors.border,
                    }}
                  />
                ) : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '900', fontSize: 14, color: AMS_BLUE }} numberOfLines={2}>
                    {draft.namaKegiatan || 'Tanpa nama kegiatan'}
                  </Text>
                  <Text style={{ fontWeight: '700', fontSize: 12 }} numberOfLines={2}>
                    {draft.namaPaket}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    {formatDateTime(draft.updatedAt) || draft.updatedAt}
                  </Text>
                  {draft.keterangan ? (
                    <Text style={{ fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                      {draft.keterangan}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <NeoButton
                  label="Muat"
                  variant="neutral"
                  compact
                  onPress={() => handleLoadDraft(draft)}
                />
                <NeoButton
                  label="Preview"
                  variant="secondary"
                  compact
                  onPress={() => {
                    handleLoadDraft(draft)
                    setPreviewOpen(true)
                  }}
                />
                <NeoButton
                  label="Hapus"
                  variant="danger"
                  compact
                  disabled={busy}
                  onPress={() => void handleDeleteDraft(draft.id)}
                />
              </View>
            </Pressable>
          ))}
        </View>

        {Platform.OS === 'web' ? (
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
            Catatan: capture story terbaik di build native (Android/iOS).
          </Text>
        ) : null}
      </ScrollView>

      <PekerjaanPickerModal
        visible={pickerOpen}
        selectedId={form.context?.pekerjaanId}
        onClose={() => setPickerOpen(false)}
        onSelect={(item) => void handleSelectPekerjaan(item)}
      />

      <ChoiceDialog
        visible={sourceOpen}
        title="Sumber foto"
        message="Pilih kamera atau galeri."
        onClose={() => setSourceOpen(false)}
        options={[
          { label: 'Kamera', variant: 'primary', onPress: () => void pickImage('camera') },
          { label: 'Galeri', variant: 'neutral', onPress: () => void pickImage('gallery') },
        ]}
      />

      <KegiatanStoryPreviewModal
        visible={previewOpen && Boolean(previewMeta && form.photoUri)}
        imageUri={form.photoUri}
        meta={previewMeta}
        caption={form.caption}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  )
}
