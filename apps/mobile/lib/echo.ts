import { Platform } from 'react-native'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getSessionTokenSync } from './session'
import {
  getBroadcastingAuthUrl,
  getReverbAppKey,
  getReverbHost,
  getReverbPort,
  getReverbScheme,
  isReverbEnabled,
} from './reverb-config'

type EchoInstance = Echo<'reverb'>

let echoInstance: EchoInstance | null = null

function attachPusherGlobal() {
  const target = globalThis as typeof globalThis & { Pusher?: typeof Pusher }
  if (Platform.OS === 'web' && typeof globalThis.window !== 'undefined') {
    ;(globalThis.window as Window & { Pusher?: typeof Pusher }).Pusher = Pusher
    return
  }

  target.Pusher = Pusher
}

export function getEcho(): EchoInstance | null {
  if (!isReverbEnabled()) {
    return null
  }

  if (!echoInstance) {
    attachPusherGlobal()

    const scheme = getReverbScheme()
    const forceTLS = scheme === 'https'
    const host = getReverbHost()
    const port = getReverbPort()
    const authEndpoint = getBroadcastingAuthUrl()

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: getReverbAppKey(),
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS,
      enabledTransports: ['ws', 'wss'],
      authEndpoint,
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          const token = getSessionTokenSync()
          if (!token) {
            callback(new Error('Token sesi tidak tersedia'), null)
            return
          }

          const body = new URLSearchParams({
            socket_id: socketId,
            channel_name: channel.name,
          })

          fetch(authEndpoint, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${token}`,
            },
            body: body.toString(),
          })
            .then(async (response) => {
              if (!response.ok) {
                const text = await response.text()
                callback(new Error(text || `Auth gagal (${response.status})`), null)
                return
              }

              const data = await response.json()
              callback(null, data)
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Permintaan auth gagal'
              callback(new Error(message), null)
            })
        },
      }),
    })
  }

  return echoInstance
}

export function disconnectEcho() {
  echoInstance?.disconnect()
  echoInstance = null
}