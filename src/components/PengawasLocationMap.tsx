import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { PresenceOnlinePoint } from '@pengawas/shared/presence'
import { DEFAULT_MAP_CENTER } from '@/lib/koordinat-utils'
import { formatDateTime } from '@/lib/format'
import { L } from '@/lib/leaflet-icon'

type PengawasLocationMapProps = {
  points: PresenceOnlinePoint[]
}

export function PengawasLocationMap({ points }: PengawasLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 11)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(resizeTimer)
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) {
      return
    }

    layer.clearLayers()

    if (!points.length) {
      map.setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 11)
      return
    }

    const bounds = L.latLngBounds([])

    for (const point of points) {
      const marker = L.marker([point.lat, point.lng])
      marker.bindPopup(
        [
          `<strong>${escapeHtml(point.name)}</strong>`,
          escapeHtml(point.email),
          `Koordinat: ${escapeHtml(point.koordinat || '-')}`,
          `Terakhir lokasi: ${escapeHtml(formatDateTime(point.koordinat_at))}`,
          `Terakhir online: ${escapeHtml(formatDateTime(point.last_seen_at))}`,
        ].join('<br />'),
      )
      marker.addTo(layer)
      bounds.extend([point.lat, point.lng])
    }

    if (points.length === 1) {
      const only = points[0]
      if (only) {
        map.setView([only.lat, only.lng], 14)
      }
      return
    }

    map.fitBounds(bounds.pad(0.2))
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 80)
    return () => window.clearTimeout(resizeTimer)
  }, [points])

  return <div ref={mapContainerRef} className="pengawas-location-map" aria-label="Peta lokasi pengawas" />
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}