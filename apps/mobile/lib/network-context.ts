import NetInfo from '@react-native-community/netinfo'
import { assessNetworkConnectivity, type NetworkConnectivity } from '@/lib/network-context-core'

export type { NetworkConnectivity } from '@/lib/network-context-core'
export { assessNetworkConnectivity, shouldPreferCellularLocation } from '@/lib/network-context-core'

export async function fetchNetworkConnectivity(): Promise<NetworkConnectivity> {
  const state = await NetInfo.fetch()
  return assessNetworkConnectivity(state)
}