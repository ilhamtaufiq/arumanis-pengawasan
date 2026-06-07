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

export async function getGPSFromOCR(file: File): Promise<string | null> {
  try {
    const worker = await createWorker('eng')
    const { data: { text } } = await worker.recognize(file)
    await worker.terminate()

    // 1. Match Decimal Degrees e.g. Lat -6.123 Long 106.123
    const latMatch = text.match(/Lat\s*(-?\d+\.\d+)/i)
    const lonMatch = text.match(/Long\s*(-?\d+\.\d+)/i)
    if (latMatch && lonMatch) {
      return `${latMatch[1]}, ${lonMatch[1]}`
    }

    // 2. Match simple comma separated pair e.g. -6.12345, 106.12345
    const pairMatch = text.match(/(-?\d+\.\d+)\s*[,|]\s*(-?\d+\.\d+)/)
    if (pairMatch) {
      return `${pairMatch[1]}, ${pairMatch[2]}`
    }

    // Helper to convert DMS/DDM to decimal
    const toDecimal = (deg: number, min: number, sec: number, dir: string) => {
      let dec = deg + (min / 60) + (sec / 3600)
      if (dir === 'S' || dir === 'W') dec = dec * -1
      return dec
    }

    // 3. Match Degrees Minutes Seconds (DMS)
    // E.g. S 6° 12' 34.5", E 106° 12' 34.5"
    // E.g. 6°12'34.5"S, 106°12'34.5"E
    const dmsRegex = /([NS])?\s*(\d+)[°\s]+(\d+)['\s]+([\d\.]+)(?:"|''|”)?\s*([NS])?[\s,\|]+([EW])?\s*(\d+)[°\s]+(\d+)['\s]+([\d\.]+)(?:"|''|”)?\s*([EW])?/i
    const dmsMatch = text.match(dmsRegex)
    if (dmsMatch) {
      const latDir = (dmsMatch[1] || dmsMatch[5] || 'N').toUpperCase()
      const lat = toDecimal(parseInt(dmsMatch[2] || '0'), parseInt(dmsMatch[3] || '0'), parseFloat(dmsMatch[4] || '0'), latDir)
      
      const lonDir = (dmsMatch[6] || dmsMatch[10] || 'E').toUpperCase()
      const lon = toDecimal(parseInt(dmsMatch[7] || '0'), parseInt(dmsMatch[8] || '0'), parseFloat(dmsMatch[9] || '0'), lonDir)
      
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    }

    // 4. Match Degrees Decimal Minutes (DDM)
    // E.g. S 6° 12.345', E 106° 12.345'
    const ddmRegex = /([NS])?\s*(\d+)[°\s]+([\d\.]+)['\s]?\s*([NS])?[\s,\|]+([EW])?\s*(\d+)[°\s]+([\d\.]+)['\s]?\s*([EW])?/i
    const ddmMatch = text.match(ddmRegex)
    if (ddmMatch) {
      const latDir = (ddmMatch[1] || ddmMatch[4] || 'N').toUpperCase()
      const lat = toDecimal(parseInt(ddmMatch[2] || '0'), parseFloat(ddmMatch[3] || '0'), 0, latDir)
      
      const lonDir = (ddmMatch[5] || ddmMatch[8] || 'E').toUpperCase()
      const lon = toDecimal(parseInt(ddmMatch[6] || '0'), parseFloat(ddmMatch[7] || '0'), 0, lonDir)
      
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    }

    return null
  } catch (err) {
    console.error('OCR Error:', err)
    return null
  }
}

export async function extractCoordinates(file: File): Promise<string | null> {
  const exifCoord = await getGPSFromExif(file)
  if (exifCoord) return exifCoord
  return await getGPSFromOCR(file)
}
