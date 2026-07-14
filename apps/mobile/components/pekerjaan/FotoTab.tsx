import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ListRenderItem,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Foto, Output, PekerjaanDetail, Penerima } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { resolveFotoStatus, statusFotoText, statusFotoTone } from '@pengawas/shared/foto-status'
import { queryKeys } from '@pengawas/shared/query-keys'
import { deleteFoto, getPekerjaanDetail, updateFoto } from '@/lib/api'
import { appendFotoFileToFormData, getUnsupportedFotoFormatReason, type PickedImageAsset } from '@/lib/foto-upload'
import { enqueueFotoUpload } from '@/lib/foto-upload-queue'
import {
  clearPendingFotoPickerSession,
  readPendingFotoPickerSession,
  savePendingFotoPickerSession,
  type PendingFotoPickerSession,
} from '@/lib/foto-picker-session'
import { fotoUploadQueueKey } from '@/hooks/useFotoUploadQueue'
import { shouldQueueAfterFailedUpload, uploadFotoWithRetry } from '@/lib/resilient-foto-upload'
import {
  buildFotoSlotLookup,
  buildOutputFotoSummaries,
  countFilledSlots,
  FOTO_SLOTS,
  slotsForGroup,
  type OutputFotoSummary,
} from '@/lib/pekerjaan-helpers'
import { isFotoKoordinatInvalid, summarizeFotoKoordinatStatus } from '@pengawas/shared/foto-koordinat-status'
import { FotoPreviewModal } from '@/components/pekerjaan/FotoPreviewModal'
import { FotoEditKoordinatModal } from '@/components/pekerjaan/FotoEditKoordinatModal'
import { FotoUploadQueueBanner } from '@/components/pekerjaan/FotoUploadQueueBanner'
import { FotoUploadModal } from '@/components/pekerjaan/FotoUploadModal'
import { FotoSlotTile } from '@/components/pekerjaan/FotoSlotTile'
import type { UploadTarget } from '@/components/pekerjaan/FotoMatrixRow'
import {
  ChoiceDialog,
  ConfirmDialog,
  EmptyState,
  NeoBadge,
  NeoSurface,
  Spinner,
} from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type SourceRequest = {
  target: UploadTarget
  replaceFotoId?: number
}

type SlotActions = {
  foto: Foto
  target: UploadTarget
}

type FotoTabProps = {
  pekerjaanId: number
  pekerjaan: PekerjaanDetail
}

type NavLevel =
  | { kind: 'outputs' }
  | { kind: 'penerima'; output: Output }
  | { kind: 'slots'; output: Output; penerima?: Penerima }

const ROW_H = 72

/**
 * Tab foto anti-hang:
 * 1) List OUTPUT saja (sedikit item)
 * 2) List PENERIMA bila unit (tanpa image)
 * 3) 5 SLOT image hanya untuk 1 grup terpilih
 *
 * Lookup O(fotos) — tidak pernah bangun matriks penuh outputs×penerima.
 */
export function FotoTab({ pekerjaanId, pekerjaan }: FotoTabProps) {
  const queryClient = useQueryClient()
  // Jika detail di-slim (URL dipotong), isi thumb saja — jangan dump full URL massal (OOM / blank).
  useEffect(() => {
    const fotos = pekerjaan.foto ?? []
    if (fotos.length === 0) return
    const missingUrl = fotos.some((f) => f.id && !f.foto_url && !f.foto_thumb_url)
    if (!missingUrl) return

    let cancelled = false
    void getPekerjaanDetail(pekerjaanId)
      .then((full) => {
        if (cancelled || !full?.foto?.length) return
        const byId = new Map(full.foto.map((f) => [f.id, f]))
        queryClient.setQueryData(queryKeys.pekerjaan.detail(pekerjaanId), (prev: typeof full | undefined) => {
          if (!prev) {
            // Jangan inject payload penuh mentah; slim dulu lewat merge thumbs.
            return {
              ...full,
              foto: (full.foto ?? []).map((f) => ({
                ...f,
                foto_url: f.foto_thumb_url || f.foto_url || null,
                foto_thumb_url: f.foto_thumb_url || f.foto_url || null,
              })),
            }
          }
          return {
            ...prev,
            foto: (prev.foto ?? []).map((item) => {
              const remote = item.id != null ? byId.get(item.id) : undefined
              if (!remote) return item
              const thumb = remote.foto_thumb_url || remote.foto_url || null
              return {
                ...item,
                // Prefer thumb di list; full URL di-load saat preview bila sudah ada di cache remote
                foto_thumb_url: item.foto_thumb_url || thumb,
                foto_url: item.foto_url || remote.foto_url || thumb,
                validasi_koordinat: item.validasi_koordinat ?? remote.validasi_koordinat,
                validasi_koordinat_message:
                  item.validasi_koordinat_message ?? remote.validasi_koordinat_message,
                koordinat: item.koordinat || remote.koordinat,
              }
            }),
            foto_count: prev.foto_count ?? full.foto_count ?? full.foto?.length,
          }
        })
      })
      .catch(() => {
        // Biarkan UI pakai metadata tanpa URL
      })

    return () => {
      cancelled = true
    }
  }, [pekerjaanId, pekerjaan.foto, queryClient])

  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewFoto, setPreviewFoto] = useState<Foto | null>(null)
  const [previewTarget, setPreviewTarget] = useState<UploadTarget | null>(null)
  const [editKoordinatFoto, setEditKoordinatFoto] = useState<Foto | null>(null)
  const [editKoordinatError, setEditKoordinatError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Foto | null>(null)
  const [sourceRequest, setSourceRequest] = useState<SourceRequest | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    target: UploadTarget
    asset: PickedImageAsset
    replaceFotoId?: number
  } | null>(null)
  const [slotActions, setSlotActions] = useState<SlotActions | null>(null)
  const [coordsFilter, setCoordsFilter] = useState<'all' | 'invalid'>('all')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [nav, setNav] = useState<NavLevel>({ kind: 'outputs' })
  const pendingPickerRequestRef = useRef<SourceRequest | null>(null)

  const fotoList = pekerjaan.foto ?? []
  const outputList = pekerjaan.output ?? []
  const penerimaList = pekerjaan.penerima ?? []

  // Index murah — O(fotos), sinkron OK
  const lookup = useMemo(() => buildFotoSlotLookup(fotoList), [fotoList])
  const coordsSummary = useMemo(() => summarizeFotoKoordinatStatus(fotoList), [fotoList])
  const outputSummaries = useMemo(
    () => buildOutputFotoSummaries(outputList, lookup, penerimaList),
    [outputList, lookup, penerimaList],
  )

  const statusFoto = resolveFotoStatus(pekerjaan)
  const detailQueryKey = queryKeys.pekerjaan.detail(pekerjaanId)

  const patchDetailFotos = useCallback(
    (updater: (fotos: Foto[]) => Foto[]) => {
      queryClient.setQueryData<PekerjaanDetail>(detailQueryKey, (previous) => {
        if (!previous) return previous
        const nextFotos = updater(previous.foto ?? [])
        return { ...previous, foto: nextFotos, foto_count: nextFotos.length }
      })
    },
    [detailQueryKey, queryClient],
  )

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      target: UploadTarget
      asset: PickedImageAsset
      koordinat: string
      replaceFotoId?: number
    }) => {
      const formatError = getUnsupportedFotoFormatReason(input.asset)
      if (formatError) throw new Error(formatError)

      const formData = new FormData()
      formData.append('pekerjaan_id', String(pekerjaanId))
      formData.append('komponen_id', String(input.target.output.id))
      formData.append('keterangan', input.target.slot)
      formData.append('koordinat', input.koordinat)
      if (input.target.penerima) {
        formData.append('penerima_id', String(input.target.penerima.id))
      }

      await appendFotoFileToFormData(formData, input.asset)
      setUploadProgress(0)

      return uploadFotoWithRetry(formData, {
        fotoId: input.replaceFotoId,
        onProgress: (progress) => {
          if (progress.percent != null) setUploadProgress(progress.percent)
        },
      })
    },
    onSuccess: (created, variables) => {
      const localUri = variables.asset.uri
      const nextFoto: Foto = {
        ...created,
        id: created.id ?? variables.replaceFotoId ?? created.id,
        pekerjaan_id: created.pekerjaan_id ?? pekerjaanId,
        komponen_id: created.komponen_id ?? variables.target.output.id,
        penerima_id: created.penerima_id ?? variables.target.penerima?.id ?? null,
        keterangan: created.keterangan ?? variables.target.slot,
        koordinat: created.koordinat ?? variables.koordinat,
        foto_url: created.foto_url || localUri,
        foto_thumb_url: created.foto_thumb_url || created.foto_url || localUri,
      }

      patchDetailFotos((fotos) => {
        if (variables.replaceFotoId) {
          const replaced = fotos.map((item) =>
            item.id === variables.replaceFotoId ? { ...item, ...nextFoto, id: variables.replaceFotoId } : item,
          )
          if (replaced.some((item) => item.id === variables.replaceFotoId)) return replaced
        }
        return [...fotos.filter((item) => item.id !== nextFoto.id), nextFoto]
      })

      setUploadingTarget(null)
      setPendingUpload(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setSourceRequest(null)
      setErrorMessage(null)
      setUploadProgress(null)
    },
    onError: async (error, variables) => {
      setUploadProgress(null)
      if (shouldQueueAfterFailedUpload(error)) {
        try {
          await enqueueFotoUpload({
            pekerjaanId,
            komponenId: variables.target.output.id,
            komponenLabel: variables.target.output.komponen,
            slot: variables.target.slot,
            koordinat: variables.koordinat,
            asset: variables.asset,
            penerimaId: variables.target.penerima?.id,
            replaceFotoId: variables.replaceFotoId,
          })
          await queryClient.invalidateQueries({ queryKey: fotoUploadQueueKey })
          setUploadingTarget(null)
          setPendingUpload(null)
          setSourceRequest(null)
          setErrorMessage(
            'Koneksi tidak stabil. Foto disimpan di perangkat dan akan dikirim otomatis saat online.',
          )
          return
        } catch (queueError) {
          setUploadingTarget(null)
          setErrorMessage(
            formatApiError(
              queueError,
              'Gagal mengunggah foto dan tidak dapat disimpan sementara. Coba lagi dengan koneksi yang lebih stabil.',
            ),
          )
          return
        }
      }
      setUploadingTarget(null)
      setErrorMessage(formatApiError(error, 'Gagal mengunggah foto.'))
    },
  })

  const editKoordinatMutation = useMutation({
    mutationFn: async (input: { foto: Foto; koordinat: string }) => {
      const formData = new FormData()
      formData.append('pekerjaan_id', String(input.foto.pekerjaan_id || pekerjaanId))
      if (input.foto.komponen_id != null) {
        formData.append('komponen_id', String(input.foto.komponen_id))
      }
      const progress = (String(input.foto.keterangan || '0%').split('|')[0] ?? '').trim() || '0%'
      formData.append('keterangan', progress)
      formData.append('koordinat', input.koordinat.trim())
      if (input.foto.penerima_id != null && Number(input.foto.penerima_id) > 0) {
        formData.append('penerima_id', String(input.foto.penerima_id))
      }
      if (input.foto.unit_index != null && Number(input.foto.unit_index) > 0) {
        formData.append('unit_index', String(input.foto.unit_index))
      }
      return updateFoto(input.foto.id, formData)
    },
    onSuccess: (updated, variables) => {
      patchDetailFotos((fotos) =>
        fotos.map((item) => {
          if (item.id !== variables.foto.id && item.id !== updated.id) return item
          return {
            ...item,
            ...updated,
            id: variables.foto.id,
            foto_url: updated.foto_url || item.foto_url,
            foto_thumb_url: updated.foto_thumb_url || item.foto_thumb_url || updated.foto_url || item.foto_url,
            keterangan: updated.keterangan || item.keterangan,
            unit_index: updated.unit_index ?? item.unit_index,
          }
        }),
      )
      setEditKoordinatFoto(null)
      setEditKoordinatError(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setCoordsFilter('all')
      setErrorMessage(null)
    },
    onError: (error) => {
      setEditKoordinatError(formatApiError(error, 'Gagal memperbarui koordinat foto.'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (fotoId: number) => deleteFoto(fotoId),
    onMutate: async (fotoId) => {
      await queryClient.cancelQueries({ queryKey: detailQueryKey })
      const previous = queryClient.getQueryData<PekerjaanDetail>(detailQueryKey)
      if (previous) {
        queryClient.setQueryData<PekerjaanDetail>(detailQueryKey, {
          ...previous,
          foto: (previous.foto ?? []).filter((item) => item.id !== fotoId),
          foto_count: Math.max(0, (previous.foto ?? []).filter((item) => item.id !== fotoId).length),
        })
      }
      return { previous }
    },
    onSuccess: () => {
      setPendingDelete(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setSlotActions(null)
      setErrorMessage(null)
    },
    onError: (error, _fotoId, context) => {
      if (context?.previous) queryClient.setQueryData(detailQueryKey, context.previous)
      setErrorMessage(formatApiError(error, 'Gagal menghapus foto.'))
    },
  })

  const isBusy =
    uploadMutation.isPending || deleteMutation.isPending || editKoordinatMutation.isPending

  const uploadingKey = uploadingTarget
    ? `${uploadingTarget.output.id}:${uploadingTarget.slot}:${uploadingTarget.penerima?.id ?? 0}`
    : null

  function assetFromResult(result: ImagePicker.ImagePickerResult): PickedImageAsset | null {
    if (result.canceled || !result.assets[0]) return null
    const asset = result.assets[0]
    const rawMime = (asset.mimeType || 'image/jpeg').toLowerCase()
    const mimeType =
      rawMime.includes('png') ? 'image/png' : rawMime.includes('jpeg') || rawMime.includes('jpg')
        ? 'image/jpeg'
        : 'image/jpeg'
    return {
      uri: asset.uri,
      mimeType,
      fileName: asset.fileName ?? undefined,
      file: asset.file ?? undefined,
      exif: (asset.exif as Record<string, unknown> | null | undefined) ?? null,
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
    exif: true,
    ...(Platform.OS === 'ios' && ImagePicker.UIImagePickerPreferredAssetRepresentationMode
      ? {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        }
      : {}),
  }

  function requestToSession(request: SourceRequest): Omit<PendingFotoPickerSession, 'createdAt'> {
    return {
      pekerjaanId,
      komponenId: request.target.output.id,
      slot: request.target.slot,
      penerimaId: request.target.penerima?.id,
      replaceFotoId: request.replaceFotoId,
    }
  }

  function resolveRequestFromSession(session: PendingFotoPickerSession): SourceRequest | null {
    const output = outputList.find((item) => item.id === session.komponenId)
    if (!output) return null
    const penerima =
      session.penerimaId != null
        ? penerimaList.find((item) => item.id === session.penerimaId)
        : undefined
    const target: UploadTarget = penerima
      ? { output, slot: session.slot, penerima }
      : { output, slot: session.slot }
    return { target, replaceFotoId: session.replaceFotoId }
  }

  const openUploadModal = useCallback((request: SourceRequest, asset: PickedImageAsset) => {
    setSourceRequest(null)
    setSlotActions(null)
    setUploadingTarget(request.target)
    setPendingUpload({
      target: request.target,
      asset,
      replaceFotoId: request.replaceFotoId,
    })
  }, [])

  const handlePickerResult = useCallback(
    (request: SourceRequest, result: ImagePicker.ImagePickerResult) => {
      pendingPickerRequestRef.current = null
      void clearPendingFotoPickerSession()
      const asset = assetFromResult(result)
      if (!asset) {
        if (!result.canceled) setErrorMessage('Tidak ada foto yang dipilih.')
        return
      }
      const unsupported = getUnsupportedFotoFormatReason(asset)
      if (unsupported) {
        setErrorMessage(unsupported)
        return
      }
      openUploadModal(request, asset)
    },
    [openUploadModal],
  )

  async function handlePickerFailure(message: string) {
    pendingPickerRequestRef.current = null
    await clearPendingFotoPickerSession()
    setErrorMessage(message)
  }

  async function persistAndLaunch(
    request: SourceRequest,
    launch: () => Promise<ImagePicker.ImagePickerResult>,
    failLabel: string,
  ) {
    pendingPickerRequestRef.current = request
    setSourceRequest(null)
    setErrorMessage(null)
    try {
      await savePendingFotoPickerSession(requestToSession(request))
      const result = await launch()
      handlePickerResult(request, result)
    } catch (error) {
      await handlePickerFailure(error instanceof Error ? error.message : failLabel)
    }
  }

  async function launchCameraNow(request: SourceRequest) {
    const camera = await ImagePicker.requestCameraPermissionsAsync()
    if (!camera.granted) {
      setSourceRequest(null)
      setErrorMessage('Izin kamera ditolak. Aktifkan di pengaturan perangkat untuk mengambil foto.')
      return
    }
    await persistAndLaunch(request, () => ImagePicker.launchCameraAsync(pickerOptions), 'Gagal membuka kamera.')
  }

  async function launchGalleryNow(request: SourceRequest) {
    const gallery = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!gallery.granted) {
      setSourceRequest(null)
      setErrorMessage('Izin galeri ditolak. Aktifkan di pengaturan perangkat untuk memilih foto.')
      return
    }
    await persistAndLaunch(
      request,
      () => ImagePicker.launchImageLibraryAsync(pickerOptions),
      'Gagal membuka galeri.',
    )
  }

  useEffect(() => {
    if (Platform.OS === 'web') return
    let cancelled = false
    const recoverPendingPickerResult = async () => {
      try {
        let request = pendingPickerRequestRef.current
        if (!request) {
          const session = await readPendingFotoPickerSession(pekerjaanId)
          if (session) {
            request = resolveRequestFromSession(session)
            if (!request) return
            pendingPickerRequestRef.current = request
          }
        }
        if (!request || cancelled) return
        const pending = await ImagePicker.getPendingResultAsync()
        const latest = pending.at(-1)
        if (!latest || !('assets' in latest) || cancelled) return
        handlePickerResult(request, latest)
      } catch {
        // best-effort
      }
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void recoverPendingPickerResult()
    })
    void recoverPendingPickerResult()
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [pekerjaanId, outputList, penerimaList, handlePickerResult])

  const startUpload = useCallback((target: UploadTarget, replaceFotoId?: number) => {
    setErrorMessage(null)
    setSourceRequest({ target, replaceFotoId })
  }, [])

  const openPreview = useCallback((foto: Foto, target: UploadTarget) => {
    setPreviewFoto(foto)
    setPreviewTarget(target)
  }, [])

  const closePreview = useCallback(() => {
    if (isBusy) return
    setPreviewFoto(null)
    setPreviewTarget(null)
  }, [isBusy])

  const requestDelete = useCallback((foto: Foto) => {
    setPendingDelete(foto)
  }, [])

  function submitUpload(koordinat: string) {
    if (!pendingUpload) return
    uploadMutation.mutate({
      target: pendingUpload.target,
      asset: pendingUpload.asset,
      koordinat,
      replaceFotoId: pendingUpload.replaceFotoId,
    })
  }

  function handleReplaceFromPreview() {
    if (!previewFoto || !previewTarget) return
    const fotoId = previewFoto.id
    const target = previewTarget
    setPreviewFoto(null)
    setPreviewTarget(null)
    startUpload(target, fotoId)
  }

  function handleDeleteFromPreview() {
    if (!previewFoto) return
    const foto = previewFoto
    setPreviewFoto(null)
    setPreviewTarget(null)
    requestDelete(foto)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id)
  }

  const openOutput = useCallback(
    (summary: OutputFotoSummary) => {
      if (summary.isUnit) {
        setNav({ kind: 'penerima', output: summary.output })
        return
      }
      setNav({ kind: 'slots', output: summary.output })
    },
    [],
  )

  const openPenerima = useCallback((output: Output, penerima: Penerima) => {
    setNav({ kind: 'slots', output, penerima })
  }, [])

  const goBack = useCallback(() => {
    setNav((current) => {
      if (current.kind === 'slots' && current.penerima) {
        return { kind: 'penerima', output: current.output }
      }
      return { kind: 'outputs' }
    })
  }, [])

  // —— Level data ——
  const penerimaRows = useMemo(() => {
    if (nav.kind !== 'penerima') return []
    const outputId = nav.output.id
    return penerimaList.map((p) => {
      const filled = countFilledSlots(lookup, outputId, p.id)
      const slots = slotsForGroup(lookup, outputId, p.id)
      const invalid = slots.filter((s) => s.foto && isFotoKoordinatInvalid(s.foto)).length
      return { penerima: p, filled, total: FOTO_SLOTS.length, invalid }
    }).filter((row) => (coordsFilter === 'invalid' ? row.invalid > 0 : true))
  }, [nav, penerimaList, lookup, coordsFilter])

  const activeSlots = useMemo(() => {
    if (nav.kind !== 'slots') return []
    return slotsForGroup(lookup, nav.output.id, nav.penerima?.id ?? null)
  }, [nav, lookup])

  const filteredOutputs = useMemo(() => {
    if (coordsFilter !== 'invalid') return outputSummaries
    return outputSummaries.filter((s) => {
      if (!s.isUnit) {
        return slotsForGroup(lookup, s.output.id, null).some(
          (slot) => slot.foto && isFotoKoordinatInvalid(slot.foto),
        )
      }
      return penerimaList.some((p) =>
        slotsForGroup(lookup, s.output.id, p.id).some(
          (slot) => slot.foto && isFotoKoordinatInvalid(slot.foto),
        ),
      )
    })
  }, [outputSummaries, coordsFilter, lookup, penerimaList])

  const renderOutput: ListRenderItem<OutputFotoSummary> = useCallback(
    ({ item }) => (
      <ListRow
        title={item.output.komponen}
        subtitle={
          item.isUnit
            ? `${item.groupCount} penerima · ketuk untuk pilih unit`
            : 'Output komunal · ketuk isi slot'
        }
        badge={`${item.filled}/${item.total}`}
        tone={item.filled >= item.total ? 'ok' : 'warn'}
        onPress={() => openOutput(item)}
      />
    ),
    [openOutput],
  )

  const renderPenerima: ListRenderItem<(typeof penerimaRows)[number]> = useCallback(
    ({ item }) => {
      if (nav.kind !== 'penerima') return null
      return (
        <ListRow
          title={item.penerima.nama}
          subtitle={item.invalid > 0 ? `${item.invalid} GPS invalid` : 'Ketuk untuk isi/lihat slot'}
          badge={`${item.filled}/${item.total}`}
          tone={item.invalid > 0 ? 'danger' : item.filled >= item.total ? 'ok' : 'warn'}
          onPress={() => openPenerima(nav.output, item.penerima)}
        />
      )
    },
    [nav, openPenerima],
  )

  if (outputList.length === 0) {
    return (
      <EmptyState
        title="Belum ada output"
        description="Matriks foto membutuhkan data output dari pekerjaan ini."
      />
    )
  }

  return (
    // Jangan pakai `gap` di parent FlatList/ScrollView flex — di Android sering height 0 (blank).
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ marginBottom: 10 }}>
        <FotoUploadQueueBanner />
      </View>

      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12, marginBottom: 10 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <NeoBadge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</NeoBadge>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {outputList.length} output · {fotoList.length} foto
        </Text>
      </View>

      {coordsSummary.invalid > 0 ? (
        <Pressable
          onPress={() => setCoordsFilter((p) => (p === 'invalid' ? 'all' : 'invalid'))}
          style={{
            alignSelf: 'flex-start',
            backgroundColor: coordsFilter === 'invalid' ? '#b91c1c' : '#fef2f2',
            borderWidth: 1.5,
            borderColor: '#b91c1c',
            borderRadius: radius,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontWeight: '800',
              fontSize: 11,
              color: coordsFilter === 'invalid' ? '#fff' : '#b91c1c',
            }}
          >
            {coordsFilter === 'invalid'
              ? 'Tampilkan semua'
              : `${coordsSummary.invalid} GPS invalid — filter`}
          </Text>
        </Pressable>
      ) : null}

      {isBusy ? (
        <View style={{ marginBottom: 10 }}>
          <Spinner
            label={
              uploadMutation.isPending
                ? uploadProgress != null
                  ? `Mengunggah... ${uploadProgress}%`
                  : 'Mengunggah foto...'
                : editKoordinatMutation.isPending
                  ? 'Menyimpan koordinat...'
                  : 'Menghapus foto...'
            }
          />
        </View>
      ) : null}

      {/* Breadcrumb / back */}
      {nav.kind !== 'outputs' ? (
        <Pressable
          onPress={goBack}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 4,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: '900', fontSize: 14, color: colors.foreground }}>← Kembali</Text>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: colors.mutedForeground }}>
            {nav.kind === 'penerima'
              ? nav.output.komponen
              : `${nav.output.komponen}${nav.penerima ? ` · ${nav.penerima.nama}` : ''}`}
          </Text>
        </Pressable>
      ) : null}

      {nav.kind === 'outputs' ? (
        <FlatList
          style={{ flex: 1, minHeight: 120 }}
          data={filteredOutputs}
          keyExtractor={(item) => String(item.output.id)}
          renderItem={renderOutput}
          getItemLayout={(_, index) => ({ length: ROW_H + 8, offset: (ROW_H + 8) * index, index })}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState title="Tidak ada output" description="Sesuaikan filter GPS invalid." />
          }
        />
      ) : null}

      {nav.kind === 'penerima' ? (
        <FlatList
          style={{ flex: 1, minHeight: 120 }}
          data={penerimaRows}
          keyExtractor={(item) => String(item.penerima.id)}
          renderItem={renderPenerima}
          getItemLayout={(_, index) => ({ length: ROW_H + 8, offset: (ROW_H + 8) * index, index })}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title={coordsFilter === 'invalid' ? 'Tidak ada GPS invalid' : 'Belum ada penerima'}
              description="Data penerima kosong untuk output ini."
            />
          }
        />
      ) : null}

      {nav.kind === 'slots' ? (
        <ScrollView
          style={{ flex: 1, minHeight: 120 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <NeoSurface style={{ gap: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontWeight: '900', fontSize: 15 }}>{nav.output.komponen}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {nav.penerima ? `Penerima: ${nav.penerima.nama}` : 'Output komunal'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {activeSlots.map(({ slot, foto }) => {
                const target: UploadTarget = {
                  output: nav.output,
                  slot,
                  penerima: nav.penerima,
                }
                const key = `${target.output.id}:${target.slot}:${target.penerima?.id ?? 0}`
                return (
                  <FotoSlotTile
                    key={slot}
                    slot={slot}
                    foto={foto}
                    isUploading={uploadingKey === key}
                    disabled={isBusy}
                    onPress={() => {
                      if (foto) openPreview(foto, target)
                      else startUpload(target)
                    }}
                    onLongPress={
                      foto
                        ? () => setSlotActions({ foto, target })
                        : undefined
                    }
                  />
                )
              })}
            </View>
          </NeoSurface>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: '600' }}>
            Hanya 5 slot grup ini yang memuat gambar — grup lain tidak di-render.
          </Text>
        </ScrollView>
      ) : null}

      {/* Modals — hanya mount state aktif; komponen tetap ringan */}
      {previewFoto ? (
        <FotoPreviewModal
          visible={!pendingDelete && !editKoordinatFoto}
          foto={previewFoto}
          storyContext={{
            namaPaket: pekerjaan.nama_paket,
            desa: pekerjaan.desa?.nama_desa,
            kecamatan: pekerjaan.kecamatan?.nama_kecamatan,
            pengawas: pekerjaan.pengawas?.nama,
            tahunAnggaran: pekerjaan.kegiatan?.tahun_anggaran,
          }}
          onClose={closePreview}
          onReplace={handleReplaceFromPreview}
          onEditKoordinat={() => {
            if (!previewFoto) return
            setEditKoordinatError(null)
            setEditKoordinatFoto(previewFoto)
          }}
          onDelete={handleDeleteFromPreview}
          isBusy={isBusy || editKoordinatMutation.isPending}
        />
      ) : null}

      {editKoordinatFoto ? (
        <FotoEditKoordinatModal
          visible
          foto={editKoordinatFoto}
          pekerjaanId={pekerjaanId}
          onClose={() => {
            if (editKoordinatMutation.isPending) return
            setEditKoordinatFoto(null)
            setEditKoordinatError(null)
          }}
          onSave={(koordinat) => {
            editKoordinatMutation.mutate({ foto: editKoordinatFoto, koordinat })
          }}
          isSaving={editKoordinatMutation.isPending}
          errorMessage={editKoordinatError}
        />
      ) : null}

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Hapus foto"
        message={`Foto slot "${pendingDelete?.keterangan || 'dokumentasi'}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isBusy) return
          setPendingDelete(null)
        }}
        isBusy={deleteMutation.isPending}
      />

      {pendingUpload ? (
        <FotoUploadModal
          visible
          target={pendingUpload.target}
          asset={pendingUpload.asset}
          pekerjaanId={pekerjaanId}
          onClose={() => {
            if (isBusy) return
            setPendingUpload(null)
            setUploadingTarget(null)
            setUploadProgress(null)
          }}
          onUpload={submitUpload}
          isUploading={uploadMutation.isPending}
          uploadProgress={uploadProgress}
        />
      ) : null}

      <ChoiceDialog
        visible={Boolean(sourceRequest)}
        title="Foto"
        message="Pilih sumber gambar"
        onClose={() => {
          if (isBusy) return
          setSourceRequest(null)
        }}
        options={[
          {
            label: 'Kamera',
            variant: 'primary',
            onPress: () => {
              const request = sourceRequest
              if (!request) return
              setSourceRequest(null)
              void launchCameraNow(request)
            },
          },
          {
            label: 'Galeri',
            variant: 'neutral',
            onPress: () => {
              const request = sourceRequest
              if (!request) return
              setSourceRequest(null)
              void launchGalleryNow(request)
            },
          },
        ]}
      />

      <ChoiceDialog
        visible={Boolean(slotActions)}
        title="Aksi foto"
        message={slotActions ? `Slot ${slotActions.target.slot}` : undefined}
        onClose={() => setSlotActions(null)}
        options={
          slotActions
            ? [
                {
                  label: 'Preview',
                  onPress: () => openPreview(slotActions.foto, slotActions.target),
                },
                {
                  label: 'Ganti foto',
                  onPress: () => startUpload(slotActions.target, slotActions.foto.id),
                },
                {
                  label: 'Hapus foto',
                  destructive: true,
                  onPress: () => requestDelete(slotActions.foto),
                },
              ]
            : []
        }
      />
    </View>
  )
}

const ListRow = memo(function ListRow({
  title,
  subtitle,
  badge,
  tone,
  onPress,
}: {
  title: string
  subtitle: string
  badge: string
  tone: 'ok' | 'warn' | 'danger'
  onPress: () => void
}) {
  const badgeBg = tone === 'ok' ? '#dcfce7' : tone === 'danger' ? '#fee2e2' : '#fef9c3'
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: ROW_H,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 14, color: colors.foreground }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: colors.mutedForeground }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: badgeBg,
        }}
      >
        <Text style={{ fontWeight: '800', fontSize: 11 }}>{badge}</Text>
      </View>
      <Text style={{ fontWeight: '900', fontSize: 16, color: colors.mutedForeground }}>›</Text>
    </Pressable>
  )
})
