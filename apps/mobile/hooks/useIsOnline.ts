import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { assessNetworkConnectivity } from '@/lib/network-context'

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const applyState = (state: Parameters<typeof assessNetworkConnectivity>[0]) => {
      setIsOnline(assessNetworkConnectivity(state).hasInternet)
    }

    const unsubscribe = NetInfo.addEventListener(applyState)
    void NetInfo.fetch().then(applyState)

    return unsubscribe
  }, [])

  return isOnline
}