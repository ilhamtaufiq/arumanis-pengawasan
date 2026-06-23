import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Map as MapIcon } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { L } from '@/lib/leaflet-icon'
import { DEFAULT_MAP_CENTER, formatKoordinat, parseKoordinatString } from '@/lib/koordinat-utils'
import { Button } from '@/components/ui'

type KoordinatMapPickerProps = {
  value: string
  onChange: (value: string) => void
  onStatusChange?: (status: string | null) => void
  defaultCenter?: { lat: number; lng: number }
}

export function KoordinatMapPicker({
  value,
  onChange,
  onStatusChange,
  defaultCenter = DEFAULT_MAP_CENTER,
}: KoordinatMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    if (!mapOpen || !mapContainerRef.current) {
      return
    }

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
    }

    const parsed = parseKoordinatString(value)
    const center = parsed ?? defaultCenter
    const zoom = parsed ? 16 : 12

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([center.lat, center.lng], zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    if (parsed) {
      markerRef.current = L.marker([parsed.lat, parsed.lng]).addTo(map)
    }

    map.on('click', (event) => {
      const { lat, lng } = event.latlng
      onChange(formatKoordinat(lat, lng))
      onStatusChange?.('Titik koordinat dipilih dari peta.')

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }
    })

    mapRef.current = map
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(resizeTimer)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [mapOpen, defaultCenter.lat, defaultCenter.lng, onChange, onStatusChange])

  useEffect(() => {
    if (!mapOpen || !mapRef.current) {
      return
    }

    const parsed = parseKoordinatString(value)
    if (!parsed) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([parsed.lat, parsed.lng])
    } else {
      markerRef.current = L.marker([parsed.lat, parsed.lng]).addTo(mapRef.current)
    }
  }, [value, mapOpen])

  function handleBrowserLocation() {
    if (!navigator.geolocation) {
      onStatusChange?.('Browser tidak mendukung geolocation.')
      return
    }

    setIsLocating(true)
    onStatusChange?.('Mendapatkan lokasi dari perangkat...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onChange(formatKoordinat(latitude, longitude))
        onStatusChange?.('Lokasi berhasil didapatkan dari perangkat.')
        setIsLocating(false)

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17)
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude])
          } else {
            markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current)
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        onStatusChange?.('Gagal mendapatkan lokasi dari perangkat.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function toggleMap() {
    setMapOpen((open) => {
      const next = !open
      onStatusChange?.(next ? 'Klik peta untuk memilih titik koordinat.' : null)
      return next
    })
  }

  return (
    <div className="koordinat-picker">
      <div className="upload-gps-row">
        <input
          type="text"
          className="neo-input neo-input--flex"
          placeholder="-6.123456, 106.123456"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      <div className="koordinat-picker-actions">
        <Button type="button" variant="neutral" onClick={toggleMap}>
          <MapIcon size={16} className="map-pin-icon" />
          {mapOpen ? 'Sembunyikan peta' : 'Memuat peta'}
        </Button>
        <Button type="button" variant="neutral" onClick={handleBrowserLocation} isLoading={isLocating}>
          <LocateFixed size={16} className="map-pin-icon" />
          Lokasi perangkat
        </Button>
      </div>

      {mapOpen ? (
        <div className="koordinat-map-shell">
          <div ref={mapContainerRef} className="koordinat-map" aria-label="Peta pemilih koordinat" />
          <div className="koordinat-map-hint">Klik pada peta untuk memilih titik koordinat foto.</div>
        </div>
      ) : null}
    </div>
  )
}