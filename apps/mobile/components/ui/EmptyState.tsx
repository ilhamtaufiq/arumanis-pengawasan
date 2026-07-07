import { Text } from 'react-native'
import { NeoSurface } from './NeoSurface'
import { NeoButton } from './NeoButton'
import { colors } from '@/theme/tokens'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <NeoSurface tone="muted" style={{ gap: 12, alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{title}</Text>
      {description ? <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <NeoButton label={actionLabel} variant="primary" onPress={onAction} fullWidth />
      ) : null}
    </NeoSurface>
  )
}