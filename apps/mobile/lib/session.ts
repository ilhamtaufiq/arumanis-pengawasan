import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'pengawas_mobile_token'

let memoryToken: string | null = null
let hydratePromise: Promise<string | null> | null = null

function isWeb() {
  return Platform.OS === 'web'
}

function bootstrapSessionTokenSync() {
  if (!isWeb() || typeof globalThis.sessionStorage === 'undefined') return

  try {
    memoryToken = globalThis.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    memoryToken = null
  }
}

async function readStoredToken() {
  if (isWeb()) {
    if (typeof globalThis.sessionStorage === 'undefined') return null
    return globalThis.sessionStorage.getItem(TOKEN_KEY)
  }

  return SecureStore.getItemAsync(TOKEN_KEY)
}

async function writeStoredToken(token: string) {
  if (isWeb()) {
    globalThis.sessionStorage?.setItem(TOKEN_KEY, token)
    return
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

async function removeStoredToken() {
  if (isWeb()) {
    globalThis.sessionStorage?.removeItem(TOKEN_KEY)
    return
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

bootstrapSessionTokenSync()

export function getSessionTokenSync() {
  return memoryToken
}

export function setSessionTokenSync(token: string | null) {
  memoryToken = token
}

export async function getSessionToken() {
  if (memoryToken) return memoryToken

  try {
    memoryToken = await readStoredToken()
    return memoryToken
  } catch {
    return null
  }
}

export async function ensureSessionToken() {
  if (memoryToken) return memoryToken

  if (!hydratePromise) {
    hydratePromise = getSessionToken().finally(() => {
      hydratePromise = null
    })
  }

  return hydratePromise
}

export async function setSessionToken(token: string) {
  memoryToken = token
  await writeStoredToken(token)
}

export async function clearSessionToken() {
  memoryToken = null
  await removeStoredToken()
}