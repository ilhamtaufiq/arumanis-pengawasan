/**
 * exifr/lite memanggil navigator.userAgent.includes() saat modul dievaluasi.
 * Di React Native, userAgent sering undefined → TypeError includes.
 */
if (typeof navigator === 'object' && navigator != null && typeof navigator.userAgent !== 'string') {
  Object.defineProperty(navigator, 'userAgent', {
    value: '',
    configurable: true,
  })
}