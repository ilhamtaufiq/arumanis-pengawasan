type DebugErrorInput = {
  error: unknown
  scope?: string
  extra?: Record<string, string | number | boolean | null | undefined>
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('Unknown error')
}

export function formatDebugError({ error, scope, extra }: DebugErrorInput) {
  const normalized = normalizeError(error)
  const lines: string[] = []

  lines.push('=== Pengawas Mobile Debug Error ===')
  lines.push(`Waktu: ${new Date().toISOString()}`)
  if (scope) lines.push(`Scope: ${scope}`)

  lines.push('')
  lines.push(`Nama: ${normalized.name}`)
  lines.push(`Pesan: ${normalized.message}`)

  if (normalized.stack) {
    lines.push('')
    lines.push('Stack:')
    lines.push(normalized.stack)
  }

  const componentStack = (normalized as Error & { componentStack?: string }).componentStack
  if (componentStack?.trim()) {
    lines.push('')
    lines.push('Component stack:')
    lines.push(componentStack.trim())
  }

  if (extra && Object.keys(extra).length > 0) {
    lines.push('')
    lines.push('Konteks:')
    for (const [key, value] of Object.entries(extra)) {
      lines.push(`- ${key}: ${value ?? '(kosong)'}`)
    }
  }

  lines.push('')
  lines.push('=== End Debug Error ===')

  return lines.join('\n')
}