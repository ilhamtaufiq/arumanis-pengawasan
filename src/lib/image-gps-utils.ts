import exifr from 'exifr'
import { createWorker } from 'tesseract.js'

export async function getGPSFromExif(file: File): Promise<string | null> {
  try {
    const gps = await exifr.gps(file)
    if (gps && gps.latitude && gps.longitude) {
      return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`
    }
    return null
  } catch (err) {
    console.error('EXIF Error:', err)
    return null
  }
}

// Preprocess image to make watermark text clearer for OCR (grayscale + threshold)
async function preprocessForOCR(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Convert to high-contrast black & white (good for watermarks)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        const gray = (r + g + b) / 3
        // Aggressive threshold - watermarks are usually high contrast text
        const val = gray < 160 ? 0 : 255
        data[i] = data[i + 1] = data[i + 2] = val
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// Crop bottom portion of the image (GPS Map Camera watermarks are usually placed at the bottom)
async function getBottomCrop(file: File, bottomPercent = 0.40): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!

      const cropHeight = Math.floor(img.height * bottomPercent)
      canvas.width = img.width
      canvas.height = cropHeight

      ctx.drawImage(
        img,
        0, img.height - cropHeight, img.width, cropHeight,   // source rect
        0, 0, img.width, cropHeight                         // dest rect
      )

      resolve(canvas)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// More robust parser for common watermark formats in project photos
function parseCoordinatesFromText(text: string): string | null {
  if (!text) return null

  // Clean up text
  const clean = text.replace(/\s+/g, ' ').trim()

  // Pattern 1: Explicit Lat / Long (very common in GPS Map Camera watermarks)
  // Handles: "Lat -6.794353, Long 107.228834" or "Lat:-6.79 Long 107.22" etc.
  let m = clean.match(/(?:Lat|Latitude|LS)[^\d-]*(-?\d+\.\d{3,})/i)
  const latCand = m ? parseFloat(m[1] || '0') : null

  m = clean.match(/(?:Long|Longitude|Lon|BT|BTG)[^\d-]*(-?\d+\.\d{3,})/i)
  const lonCand = m ? parseFloat(m[1] || '0') : null

  if (latCand !== null && lonCand !== null) {
    return `${latCand.toFixed(6)}, ${lonCand.toFixed(6)}`
  }

  // Pattern 2: Simple decimal pair (most common in watermarks)
  // -6.123456, 106.123456  or  -6.123456 106.123456  or -6.123456 | 106.123456
  m = clean.match(/(-?\d{1,2}\.\d{4,})\s*[,\s|;]\s*(-?\d{1,3}\.\d{4,})/)
  if (m) {
    const lat = parseFloat(m[1] || '0')
    const lon = parseFloat(m[2] || '0')
    // Basic sanity check for Indonesia area
    if (lat > -12 && lat < 8 && lon > 90 && lon < 145) {
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    }
  }

  // Pattern 3: DMS format (common on some devices/watermarks)
  // S 6° 12' 34.56", E 106° 48' 12.34"
  m = clean.match(/([NS])?\s*(\d+)[°\s]+(\d+)['′]\s*([\d.]+)["”]?\s*[,;\s]*([EW])?\s*(\d+)[°\s]+(\d+)['′]\s*([\d.]+)["”]?/i)
  if (m) {
    const latD = parseInt(m[2] || '0')
    const latM = parseInt(m[3] || '0')
    const latS = parseFloat(m[4] || '0')
    const latDir = (m[1] || m[5] || 'S').toUpperCase()
    const lat = latD + latM / 60 + latS / 3600
    const finalLat = latDir === 'S' || latDir === 'W' ? -lat : lat

    const lonD = parseInt(m[6] || '0')
    const lonM = parseInt(m[7] || '0')
    const lonS = parseFloat(m[8] || '0')
    const lonDir = (m[5] || m[9] || 'E').toUpperCase()
    const lon = lonD + lonM / 60 + lonS / 3600
    const finalLon = lonDir === 'W' || lonDir === 'S' ? -lon : lon

    return `${finalLat.toFixed(6)}, ${finalLon.toFixed(6)}`
  }

  // Pattern 4: Last resort - find two plausible decimal numbers
  const numbers = clean.match(/-?\d+\.\d{4,}/g)
  if (numbers && numbers.length >= 2) {
    for (let i = 0; i < numbers.length - 1; i++) {
      const a = parseFloat(numbers[i] || '0')
      const b = parseFloat(numbers[i + 1] || '0')
      if (a > -12 && a < 8 && b > 90 && b < 145) {
        return `${a.toFixed(6)}, ${b.toFixed(6)}`
      }
      if (b > -12 && b < 8 && a > 90 && a < 145) {
        return `${b.toFixed(6)}, ${a.toFixed(6)}`
      }
    }
  }

  return null
}

export async function getGPSFromOCR(file: File): Promise<string | null> {
  let worker: any = null
  try {
    worker = await createWorker('eng')

    // Optimize Tesseract for reading small text stamps / watermarks
    await worker.setParameters({
      tessedit_pageseg_mode: '7', // Assume it's a single text line (common for GPS watermarks)
    })

    // Attempt 1: Preprocessed full image (high contrast black/white)
    const processed = await preprocessForOCR(file)
    const { data: { text: textProc } } = await worker.recognize(processed)
    let coords = parseCoordinatesFromText(textProc)
    if (coords) return coords

    // Attempt 2: Bottom crop only (GPS Map Camera puts the big text block at the bottom)
    const bottomCrop = await getBottomCrop(file, 0.42)
    const { data: { text: textBottom } } = await worker.recognize(bottomCrop)
    coords = parseCoordinatesFromText(textBottom)
    if (coords) return coords

    // Attempt 3: Raw original as last resort
    const { data: { text: textRaw } } = await worker.recognize(file)
    coords = parseCoordinatesFromText(textRaw)
    if (coords) return coords

    return null
  } catch (err) {
    console.error('OCR Error:', err)
    return null
  } finally {
    if (worker) {
      try { await worker.terminate() } catch {}
    }
  }
}

export async function extractCoordinates(file: File): Promise<string | null> {
  // Try EXIF first (fast)
  const exifCoord = await getGPSFromExif(file)
  if (exifCoord) return exifCoord

  // Then OCR for watermarks
  return await getGPSFromOCR(file)
}
