import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Image, Platform, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Foto, Output, PekerjaanDetail, Penerima } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { resolveFotoStatus, statusFotoText, statusFotoTone } from '@pengawas/shared/foto-status'
import { queryKeys } from '@pengawas/shared/query-keys'
import { deleteFoto } from '@/lib/api'
import { appendFotoFileToFormData, type PickedImageAsset } from '@/lib/foto-upload'
import { enqueueFotoUpload } from '@/lib/foto-upload-queue'
import { fotoUploadQueueKey } from '@/hooks/useFotoUploadQueue'
import { shouldQueueAfterFailedUpload, uploadFotoWithRetry } from '@/lib/resilient-foto-upload'
import { buildFotoMatrix } from '@/lib/pekerjaan-helpers'
import { FOTO_MATRIX_PAGE_SIZE, paginateSlice, readPaginationMeta } from '@/lib/pagination'
import { FotoPreviewModal } from '@/components/pekerjaan/FotoPreviewModal'
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
  const [pendingDelete, setPendingDelete] = useState<Foto | null>(null)
  const [sourceRequest, setSourceRequest] = useState<SourceRequest | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    target: UploadTarget
    asset: PickedImageAsset
    replaceFotoId?: number
  } | null>(null)
  const [slotActions, setSlotActions] = useState<SlotActions | null>(null)
  const [matrixPage, setMatrixPage] = useState(1)
  const pendingPickerRequestRef = useRef<SourceRequest | null>(null)

  const fotoList = pekerjaan.foto ?? []
  const outputList = pekerjaan.output ?? []
  const penerimaList = pekerjaan.penerima ?? []
  const matrix = useMemo(
    () => buildFotoMatrix(outputList, fotoList, penerimaList),
    [fotoList, outputList, penerimaList],
  )
  const matrixPagination = useMemo(
    () =>
      readPaginationMeta(undefined, {
        page: matrixPage,
        perPage: FOTO_MATRIX_PAGE_SIZE,
        total: matrix.length,
      }),
    [matrix.length, matrixPage],
  )
  const pagedMatrix = useMemo(
    () => paginateSlice(matrix, matrixPage, FOTO_MATRIX_PAGE_SIZE),
    [matrix, matrixPage],
  )
  const statusFoto = resolveFotoStatus(pekerjaan)

  useEffect(() => {
    setMatrixPage(1)
  }, [pekerjaanId])

  useEffect(() => {
    if (matrixPage > matrixPagination.lastPage) {
      setMatrixPage(matrixPagination.lastPage)
    }
  }, [matrixPage, matrixPagination.lastPage])

  const detailQueryKey = queryKeys.pekerjaan.detail(pekerjaanId)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: detailQueryKey })
  }

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      target: UploadTarget
      asset: PickedImageAsset
      koordinat: string
      replaceFotoId?: number
    }) => {
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

      return uploadFotoWithRetry(formData)
    },
    onSuccess: async () => {
      setUploadingTarget(null)
      setPendingUpload(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setSourceRequest(null)
      setErrorMessage(null)
      await invalidate()
    },
    onError: async (error, variables) => {
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

  const deleteMutation = useMutation({
    mutationFn: (fotoId: number) => deleteFoto(fotoId),
    onMutate: async (fotoId) => {
      await queryClient.cancelQueries({ queryKey: detailQueryKey })
      const previous = queryClient.getQueryData<PekerjaanDetail>(detailQueryKey)
      if (previous) {
        queryClient.setQueryData<PekerjaanDetail>(detailQueryKey, {
          ...previous,
          foto: (previous.foto ?? []).filter((item) => item.id !== fotoId),
        })
      }
      return { previous }
    },
    onSuccess: async () => {
      setPendingDelete(null)
      setPreviewFoto(null)
      setPreviewTarget(null)
      setSlotActions(null)
      setErrorMessage(null)
      await invalidate()
    },
    onError: (error, _fotoId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailQueryKey, context.previous)
      }
      setErrorMessage(formatApiError(error, 'Gagal menghapus foto.'))
    },
  })

  const isBusy = uploadMutation.isPending || deleteMutation.isPending

  function assetFromResult(result: ImagePicker.ImagePickerResult): PickedImageAsset | null {
    if (result.canceled || !result.assets[0]) return null
    const asset = result.assets[0]
    return {
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? undefined,
      file: asset.file ?? undefined,
      exif: (asset.exif as Record<string, unknown> | null | undefined) ?? null,
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
    exif: true,
  }

  async function ensurePickerPermissions() {
    const [camera, gallery] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
    ])

    return {
      cameraGranted: camera.granted,
      galleryGranted: gallery.granted,
    }
  }

  function handlePickerResult(request: SourceRequest, result: ImagePicker.ImagePickerResult) {
    pendingPickerRequestRef.current = null
    const asset = assetFromResult(result)
    if (!asset) return
    openUploadModal(request, asset)
  }

  function handlePickerFailure(message: string) {
    pendingPickerRequestRef.current = null
    setErrorMessage(message)
  }

  function launchCameraNow(request: SourceRequest) {
    pendingPickerRequestRef.current = request
    setSourceRequest(null)
    setErrorMessage(null)

    void ImagePicker.launchCameraAsync(pickerOptions)
      .then((result) => handlePickerResult(request, result))
      .catch((error) => {
        handlePickerFailure(error instanceof Error ? error.message : 'Gagal membuka kamera.')
      })
  }

  function launchGalleryNow(request: SourceRequest) {
    pendingPickerRequestRef.current = request
    setSourceRequest(null)
    setErrorMessage(null)

    void ImagePicker.launchImageLibraryAsync(pickerOptions)
      .then((result) => handlePickerResult(request, result))
      .catch((error) => {
        handlePickerFailure(error instanceof Error ? error.message : 'Gagal membuka galeri.')
      })
  }

  function openUploadModal(request: SourceRequest, asset: PickedImageAsset) {
    setSourceRequest(null)
    setSlotActions(null)
    setUploadingTarget(request.target)
    setPendingUpload({
      target: request.target,
      asset,
      replaceFotoId: request.replaceFotoId,
    })
  }

  useEffect(() => {
    if (Platform.OS === 'web') return

    const recoverPendingPickerResult = () => {
      const request = pendingPickerRequestRef.current
      if (!request) return

      void ImagePicker.getPendingResultAsync()
        .then((pending) => {
          const latest = pending.at(-1)
          if (!latest || !('assets' in latest)) return
          handlePickerResult(request, latest)
        })
        .catch(() => undefined)
    }

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        recoverPendingPickerResult()
      }
    })

    recoverPendingPickerResult()
    return () => subscription.remove()
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

  function startUpload(target: UploadTarget, replaceFotoId?: number) {
    void ensurePickerPermissions()
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

      {matrix.length > FOTO_MATRIX_PAGE_SIZE ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {matrix.length} grup output · {FOTO_MATRIX_PAGE_SIZE} per halaman
        </Text>
      ) : null}

      {isBusy ? <Spinner label={uploadMutation.isPending ? 'Mengunggah foto...' : 'Menghapus foto...'} /> : null}

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
                      borderColor: colors.border,
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
                      />
                    ) : (
                      <Text style={{ fontWeight: '800', fontSize: 13 }}>{isUploading ? '...' : '+'}</Text>
                    )}
                  </View>
                  <Text style={{ fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{slot}</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, textAlign: 'center' }}>
                    {foto ? 'Ketuk preview' : 'Ketuk ambil foto'}
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
        visible={Boolean(previewFoto) && !pendingDelete}
        foto={previewFoto}
        onClose={closePreview}
        onReplace={handleReplaceFromPreview}
        onDelete={handleDeleteFromPreview}
        isBusy={isBusy}
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
        }}
        onUpload={submitUpload}
        isUploading={uploadMutation.isPending}
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
              launchCameraNow(request)
            },
          },
          {
            label: 'Galeri',
            variant: 'neutral',
            onPress: () => {
              const request = sourceRequest
              if (!request) return
              launchGalleryNow(request)
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