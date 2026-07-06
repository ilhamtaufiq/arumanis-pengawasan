import { parseKoordinatLoose } from './koordinat'

export type PresenceOnlineUser = {
  id: number
  name: string
  email: string
  avatar?: string | null
  gender?: string | null
  app: string
  last_seen_at: string
  koordinat?: string | null
  koordinat_at?: string | null
}

export type PresenceOnlinePoint = PresenceOnlineUser & {
  lat: number
  lng: number
}

export function mapPresenceToLocationPoints(users: PresenceOnlineUser[]): PresenceOnlinePoint[] {
  return users
    .filter((user) => user.app === 'pengawasan')
    .map((user) => {
      const parsed = parseKoordinatLoose(user.koordinat)
      if (!parsed) {
        return null
      }

      return {
        ...user,
        lat: parsed.lat,
        lng: parsed.lng,
      }
    })
    .filter((entry): entry is PresenceOnlinePoint => entry != null)
}

export function countPengawasPresenceOnline(users: PresenceOnlineUser[]) {
  const pengawas = users.filter((user) => user.app === 'pengawasan')
  const withKoordinat = mapPresenceToLocationPoints(pengawas)

  return {
    online: pengawas.length,
    withKoordinat: withKoordinat.length,
    withoutKoordinat: pengawas.length - withKoordinat.length,
  }
}