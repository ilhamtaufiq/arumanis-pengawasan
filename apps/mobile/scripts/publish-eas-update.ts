import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRODUCTION_API_BASE } from '../lib/api-endpoints'

type UpdateChannel = 'preview' | 'production'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const mobileDir = join(scriptDir, '..')

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const channelArg = args.find((arg) => arg === 'preview' || arg === 'production')
const channel: UpdateChannel = channelArg === 'production' ? 'production' : 'preview'

const messageIndex = args.indexOf('--message')
const message =
  messageIndex >= 0
    ? args.slice(messageIndex + 1).join(' ').trim() || `Mobile ${channel} update`
    : `Mobile ${channel} update`

const result = spawnSync(
  'bunx',
  [
    'eas',
    'update',
    '--channel',
    channel,
    '--environment',
    channel,
    '--message',
    message,
    '--non-interactive',
  ],
  {
    cwd: mobileDir,
    env: {
      ...process.env,
      EXPO_PUBLIC_APIAMIS_BASE_URL: PRODUCTION_API_BASE,
      EXPO_PUBLIC_REVERB_HOST: 'apiamis.cianjur.space',
      EXPO_PUBLIC_REVERB_PORT: '443',
      EXPO_PUBLIC_REVERB_SCHEME: 'https',
    },
    stdio: 'inherit',
    shell: false,
  },
)

process.exit(result.status ?? 1)