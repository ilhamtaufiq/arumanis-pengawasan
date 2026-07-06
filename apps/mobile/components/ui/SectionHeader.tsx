import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors } from '@/theme/tokens'

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: colors.foreground,
              lineHeight: 28,
              flexShrink: 1,
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
                lineHeight: 20,
                flexShrink: 1,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  )
}