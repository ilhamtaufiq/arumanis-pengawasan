import { describe, expect, test } from 'bun:test'
import { buildLocationAttempts } from '../apps/mobile/lib/location-strategy'
import {
  assessNetworkConnectivity,
  shouldPreferCellularLocation,
} from '../apps/mobile/lib/network-context-core'

describe('network-context', () => {
  test('shouldPreferCellularLocation when cellular radio without internet', () => {
    const network = assessNetworkConnectivity({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: false,
      isWifiEnabled: true,
      details: null,
    })

    expect(shouldPreferCellularLocation(network)).toBe(true)
  })

  test('should not prefer cellular when internet is available', () => {
    const network = assessNetworkConnectivity({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
      isWifiEnabled: true,
      details: null,
    })

    expect(shouldPreferCellularLocation(network)).toBe(false)
  })
})

describe('device-location attempts', () => {
  test('prefers network attempts first when offline on cellular', () => {
    const attempts = buildLocationAttempts(true)
    expect(attempts.map((item) => item.source)).toEqual(['network', 'network', 'gps'])
  })

  test('prefers GPS first when internet is available', () => {
    const attempts = buildLocationAttempts(false)
    expect(attempts.map((item) => item.source)).toEqual(['gps', 'network', 'network'])
  })
})