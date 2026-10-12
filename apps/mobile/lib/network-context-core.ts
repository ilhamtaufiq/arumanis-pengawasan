export type NetworkConnectivity = {
  isConnected: boolean
  hasInternet: boolean
  onCellular: boolean
  hasCellularRadio: boolean
  type: string
}

export type NetworkStateLike = {
  type: string
  isConnected: boolean | null
  isInternetReachable: boolean | null
  /** Ada di state NetInfo; tidak dipakai untuk menilai konektivitas. */
  isWifiEnabled?: boolean | null
  details?: unknown
}

function readOnlineState(state: NetworkStateLike): boolean {
  return state.isConnected === true && state.isInternetReachable !== false
}

export function assessNetworkConnectivity(state: NetworkStateLike): NetworkConnectivity {
  const isConnected = state.isConnected === true
  const onCellular = state.type === 'cellular'
  const hasCellularRadio = onCellular && isConnected

  return {
    isConnected,
    hasInternet: readOnlineState(state),
    onCellular,
    hasCellularRadio,
    type: state.type,
  }
}

export function shouldPreferCellularLocation(network: NetworkConnectivity): boolean {
  return !network.hasInternet && network.hasCellularRadio
}