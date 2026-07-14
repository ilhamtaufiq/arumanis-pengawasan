import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Image, Platform, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Foto, Output, PekerjaanDetail, Penerima } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { resolveFotoStatus, statusFotoText, statusFotoTone } from '@pengawas/shared/foto-status'
import { queryKeys } from '@pengawas/shared/query-keys'
import { deleteFoto, updateFoto } from '@/lib/api'
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
import { buildFotoMatrix } from '@/lib/pekerjaan-helpers'
import {
  isFotoKoordinatInvalid,
  summarizeFotoKoordinatStatus,
} from '@pengawas/shared/foto-koordinat-status'
import { FOTO_MATRIX_PAGE_SIZE, paginateSlice, readPaginationMeta } from '@/lib/pagination'
import { FotoPreviewModal } from '@/components/pekerjaan/FotoPreviewModal'
import { FotoEditKoordinatModal } from '@/components/pekerjaan/FotoEditKoordinatModal'
import { FotoUploadQueueBanner } from '@/components/pekerjaan/FotoUploadQueueBanner'
import { FotoUploadModal } from '@/components/pekerjaan/FotoUploadModal'
import {
  ChoiceDialog,
  ConfirmDialog,
  EmptyState,
  NeoBadge,
  NeoSurface,
  PaginationBar,
  SectionHeader,
  Spinner,
} from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type UploadTarget = {
  output: Output
  slot: string
  penerima?: Penerima
}

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

export function FotoTab({ pekerjaanId, pekerjaan }: FotoTabProps) {
  const queryClient = useQueryClient()
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
  const [matrixPage, setMatrixPage] = useState(1)
  const [coordsFilter, setCoordsFilter] = useState<'all' | 'invalid'>('all')
  /** Progress upload 0–100; null = indeterminate / idle. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const pendingPickerRequestRef = useRef<SourceRequest | null>(null)

  const fotoList = pekerjaan.foto ?? []
  const outputList = pekerjaan.output ?? []
  const penerimaList = pekerjaan.penerima ?? []
  const coordsSummary = useMemo(() => summarizeFotoKoordinatStatus(fotoList), [fotoList])
  const matrix = useMemo(
    () => buildFotoMatrix(outputList, fotoList, penerimaList),
    [fotoList, outputList, penerimaList],
  )
  const filteredMatrix = useMemo(() => {
    if (coordsFilter !== 'invalid') return matrix
    return matrix.filter((row) =>
      row.slots.some((s) => s.foto && isFotoKoordinatInvalid(s.foto)),
    )
  }, [matrix, coordsFilter])
  const matrixPagination = useMemo(
    () =>
      readPaginationMeta(undefined, {
        page: matrixPage,
        perPage: FOTO_MATRIX_PAGE_SIZE,
        total: filteredMatrix.length,
      }),
    [filteredMatrix.length, matrixPage],
  )
  const pagedMatrix = useMemo(
    () => paginateSlice(filteredMatrix, matrixPage, FOTO_MATRIX_PAGE_SIZE),
    [filteredMatrix, matrixPage],
  )
  const statusFoto = resolveFotoStatus(pekerjaan)

  useEffect(() => {
    setMatrixPage(1)
  }, [pekerjaanId, coordsFilter])

  useEffect(() => {
    if (matrixPage > matrixPagination.lastPage) {
      setMatrixPage(matrixPagination.lastPage)
    }
  }, [matrixPage, matrixPagination.lastPage])

  const detailQueryKey = queryKeys.pekerjaan.detail(pekerjaanId)

  const patchDetailFotos = useCallback(
    (updater: (fotos: Foto[]) => Foto[]) => {
      queryClient.setQueryData<PekerjaanDetail>(detailQueryKey, (previous) => {
        if (!previous) return previous
        const nextFotos = updater(previous.foto ?? [])
        return {
          ...previous,
          foto: nextFotos,
          foto_count: nextFotos.length,
        }
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
      if (formatError) {
        throw new Error(formatError)
      }

      if (input.replaceFotoId) {
        await deleteFoto(input.replaceFotoId)
      }

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
        onProgress: (progress) => {
          if (progress.percent != null) {
            setUploadProgress(progress.percent)
          }
        },
      })
    },
    onSuccess: (created, variables) => {
      // Patch cache lokal — hindari refetch detail penuh (jank + payload gemuk).
      const localUri = variables.asset.uri
      const nextFoto: Foto = {
        ...created,
        pekerjaan_id: created.pekerjaan_id ?? pekerjaanId,
        komponen_id: created.komponen_id ?? variables.target.output.id,
        penerima_id: created.penerima_id ?? variables.target.penerima?.id ?? null,
        keterangan: created.keterangan ?? variables.target.slot,
        koordinat: created.koordinat ?? variables.koordinat,
        foto_url: created.foto_url || localUri,
        foto_thumb_url: created.foto_thumb_url || created.foto_url || localUri,
      }

      patchDetailFotos((fotos) => {
        const withoutReplaced = variables.replaceFotoId
          ? fotos.filter((item) => item.id !== variables.replaceFotoId)
          : fotos
        const withoutDup = withoutReplaced.filter((item) => item.id !== nextFoto.id)
        return [...withoutDup, nextFoto]
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
    onSuccess: (updated) => {
      patchDetailFotos((fotos) =>
        fotos.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      )
      setEditKoordinatFoto(null)
      setEditKoordinatError(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
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
      // Cache sudah di-patch di onMutate — tidak perlu refetch detail penuh.
      setPendingDelete(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setSlotActions(null)
      setErrorMessage(null)
    },
    onError: (error, _fotoId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailQueryKey, context.previous)
      }
      setErrorMessage(formatApiError(error, 'Gagal menghapus foto.'))
    },
  })

  const isBusy =
    uploadMutation.isPending || deleteMutation.isPending || editKoordinatMutation.isPending

  function assetFromResult(result: ImagePicker.ImagePickerResult): PickedImageAsset | null {
    if (result.canceled || !result.assets[0]) return null
    const asset = result.assets[0]
    // Beberapa galeri Android mengembalikan image/jpg (non-standard) atau HEIC.
    // Meta di-normalize ke jpeg/png saat FormData; di sini jaga mime agar tidak kosong.
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
    // Jangan re-encode agresif: quality < 1 di beberapa device menghapus EXIF GPS dari file.
    // EXIF masih dibaca dari asset.exif, tapi deep parse file butuh GPS di binary.
    quality: 1,
    allowsEditing: false,
    exif: true,
    // iOS: paksa representasi kompatibel (hindari HEIC yang ditolak API mimes jpg/png).
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

    return {
      target,
      replaceFotoId: session.replaceFotoId,
    }
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
        // User cancel — jangan tampilkan error.
        if (!result.canceled) {
          setErrorMessage('Tidak ada foto yang dipilih.')
        }
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

    await persistAndLaunch(
      request,
      () => ImagePicker.launchCameraAsync(pickerOptions),
      'Gagal membuka kamera.',
    )
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
        // 1) Context in-memory (app tidak di-kill)
        let request = pendingPickerRequestRef.current

        // 2) Context persisten (Android process death saat kamera/galeri)
        if (!request) {
          const session = await readPendingFotoPickerSession(pekerjaanId)
          if (session) {
            request = resolveRequestFromSession(session)
            if (!request) {
              // Output/penerima belum di cache — biarkan session sampai data ready.
              return
            }
            pendingPickerRequestRef.current = request
          }
        }

        if (!request || cancelled) return

        const pending = await ImagePicker.getPendingResultAsync()
        const latest = pending.at(-1)
        if (!latest || !('assets' in latest) || cancelled) return

        handlePickerResult(request, latest)
      } catch {
        // Recovery best-effort.
      }
    }

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void recoverPendingPickerResult()
      }
    })

    void recoverPendingPickerResult()
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [pekerjaanId, outputList, penerimaList, handlePickerResult])

  function submitUpload(koordinat: string) {
    if (!pendingUpload) return
    uploadMutation.mutate({
      target: pendingUpload.target,
      asset: pendingUpload.asset,
      koordinat,
      replaceFotoId: pendingUpload.replaceFotoId,
    })
  }

  function startUpload(target: UploadTarget, replaceFotoId?: number) {
    setErrorMessage(null)
    setSourceRequest({ target, replaceFotoId })
  }

  function openPreview(foto: Foto, target: UploadTarget) {
    setPreviewFoto(foto)
    setPreviewTarget(target)
  }

  function closePreview() {
    if (isBusy) return
    setPreviewFoto(null)
    setPreviewTarget(null)
  }

  function requestDelete(foto: Foto) {
    setPendingDelete(foto)
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

  if (outputList.length === 0) {
    return (
      <EmptyState
        title="Belum ada output"
        description="Matriks foto membutuhkan data output dari pekerjaan ini."
      />
    )
  }

  return (
    <View style={{ gap: 16 }}>
      <FotoUploadQueueBanner />

      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <NeoBadge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</NeoBadge>

      {coordsSummary.invalid > 0 ? (
        <NeoSurface tone="secondary" style={{ padding: 12, gap: 8, borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
          <Text style={{ fontWeight: '800', color: '#7f1d1d' }}>
            {coordsSummary.invalid} foto GPS invalid (di luar desa)
          </Text>
          <Text style={{ fontSize: 12, color: '#991b1b' }}>
            Slot berbingkai merah. Ketuk foto → ganti dengan koordinat valid.
          </Text>
          <Pressable
            onPress={() => setCoordsFilter((prev) => (prev === 'invalid' ? 'all' : 'invalid'))}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: coordsFilter === 'invalid' ? '#b91c1c' : '#fff',
              borderWidth: 1,
              borderColor: '#b91c1c',
              borderRadius: radius,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontWeight: '800',
                fontSize: 12,
                color: coordsFilter === 'invalid' ? '#fff' : '#b91c1c',
              }}
            >
              {coordsFilter === 'invalid' ? 'Tampilkan semua' : 'Filter hanya invalid'}
            </Text>
          </Pressable>
        </NeoSurface>
      ) : null}

      {filteredMatrix.length > FOTO_MATRIX_PAGE_SIZE ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {filteredMatrix.length} grup output · {FOTO_MATRIX_PAGE_SIZE} per halaman
        </Text>
      ) : null}

      {isBusy ? (
        <Spinner
          label={
            uploadMutation.isPending
              ? uploadProgress != null
                ? `Mengunggah foto... ${uploadProgress}%`
                : 'Mengunggah foto...'
              : 'Menghapus foto...'
          }
        />
      ) : null}

      {pagedMatrix.map((row, index) => (
        <NeoSurface key={`${row.output.id}-${row.penerima?.id ?? 'komunal'}-${index}`} style={{ gap: 12 }}>
          <SectionHeader
            title={row.output.komponen}
            description={
              row.penerima
                ? `Penerima: ${row.penerima.nama}`
                : row.output.penerima_is_optional
                  ? 'Output komunal'
                  : 'Tanpa penerima spesifik'
            }
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {row.slots.map(({ slot, foto }) => {
              const target: UploadTarget = {
                output: row.output,
                slot,
                penerima: row.penerima,
              }
              const isUploading =
                uploadingTarget?.output.id === target.output.id &&
                uploadingTarget.slot === target.slot &&
                uploadingTarget.penerima?.id === target.penerima?.id

              return (
                <Pressable
                  key={slot}
                  onPress={() => {
                    if (foto) {
                      openPreview(foto, target)
                      return
                    }
                    startUpload(target)
                  }}
                  onLongPress={() => {
                    if (!foto) return
                    setSlotActions({ foto, target })
                  }}
                  disabled={isBusy}
                  style={{ width: 96, gap: 6 }}
                >
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderWidth: 2,
                      borderColor:
                        foto && isFotoKoordinatInvalid(foto) ? '#dc2626' : colors.border,
                      borderRadius: radius,
                      backgroundColor: foto ? colors.card : colors.muted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {foto?.foto_thumb_url || foto?.foto_url ? (
                      <Image
                        source={{ uri: foto.foto_thumb_url || foto.foto_url || '' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        // Hindari decode async berat yang memblok frame saat buka tab.
                        fadeDuration={0}
                      />
                    ) : (
                      <Text style={{ fontWeight: '800', fontSize: 13 }}>{isUploading ? '...' : '+'}</Text>
                    )}
                    {foto && isFotoKoordinatInvalid(foto) ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: '#dc2626',
                          borderRadius: 4,
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>GPS!</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{slot}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color:
                        foto && isFotoKoordinatInvalid(foto) ? '#b91c1c' : colors.mutedForeground,
                      textAlign: 'center',
                      fontWeight: foto && isFotoKoordinatInvalid(foto) ? '700' : '400',
                    }}
                  >
                    {foto && isFotoKoordinatInvalid(foto)
                      ? 'GPS invalid'
                      : foto
                        ? 'Ketuk preview'
                        : 'Ketuk ambil foto'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </NeoSurface>
      ))}

      <PaginationBar
        currentPage={matrixPagination.currentPage}
        lastPage={matrixPagination.lastPage}
        total={matrixPagination.total}
        onPrevious={() => setMatrixPage((current) => Math.max(1, current - 1))}
        onNext={() => setMatrixPage((current) => Math.min(matrixPagination.lastPage, current + 1))}
        disabled={isBusy}
      />

      <FotoPreviewModal
        visible={Boolean(previewFoto) && !pendingDelete && !editKoordinatFoto}
        foto={previewFoto}
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

      <FotoEditKoordinatModal
        visible={Boolean(editKoordinatFoto)}
        foto={editKoordinatFoto}
        pekerjaanId={pekerjaanId}
        onClose={() => {
          if (editKoordinatMutation.isPending) return
          setEditKoordinatFoto(null)
          setEditKoordinatError(null)
        }}
        onSave={(koordinat) => {
          if (!editKoordinatFoto) return
          editKoordinatMutation.mutate({ foto: editKoordinatFoto, koordinat })
        }}
        isSaving={editKoordinatMutation.isPending}
        errorMessage={editKoordinatError}
      />

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

      <FotoUploadModal
        visible={Boolean(pendingUpload)}
        target={pendingUpload?.target ?? null}
        asset={pendingUpload?.asset ?? null}
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
              // Tutup dialog dulu agar tidak numpuk di atas camera intent.
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