declare module 'exifr/dist/lite.esm.mjs' {
  type ExifrInput = ArrayBuffer | Uint8Array | DataView | string | Blob | File

  type GpsOutput = {
    latitude: number
    longitude: number
  }

  const exifr: {
    gps(input: ExifrInput): Promise<GpsOutput | undefined>
  }

  export default exifr
}