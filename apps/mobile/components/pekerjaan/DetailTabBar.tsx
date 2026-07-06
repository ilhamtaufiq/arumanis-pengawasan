import { type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import {
  Camera,
  MessageSquareText,
  RefreshCcw,
  Shield,
  Users,
} from 'lucide-react-native'
import { type DetailTabId } from '@/lib/pekerjaan-helpers'
import { useResponsive } from '@/lib/responsive'
import { colors, radius, shadows } from '@/theme/tokens'

type DetailTabBarProps = {
  active: DetailTabId
  onChange: (tab: DetailTabId) => void
}

const DETAIL_TAB_CONFIG: Array<{ id: DetailTabId; label: string; icon: ReactNode }> = [
  { id: 'ringkasan', label: 'Ringkasan', icon: <Shield size={14} color={colors.foreground} /> },
  { id: 'progress', label: 'Progress', icon: <RefreshCcw size={14} color={colors.foreground} /> },
  { id: 'penerima', label: 'Penerima', icon: <Users size={14} color={colors.foreground} /> },
  { id: 'foto', label: 'Foto', icon: <Camera size={14} color={colors.foreground} /> },
  { id: 'tiket', label: 'Tiket', icon: <MessageSquareText size={14} color={colors.foreground} /> },
]

function TabPill({
  label,
  icon,
  selected,
  onPress,
  equalWidth,
  compact,
  iconOnly,
}: {
  label: string
  icon: ReactNode
  selected: boolean
  onPress: () => void
  equalWidth?: boolean
  compact?: boolean
  iconOnly?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: iconOnly ? 44 : equalWidth ? undefined : 88,
          flex: equalWidth ? 1 : undefined,
          paddingHorizontal: iconOnly ? 10 : compact ? 8 : 10,
          paddingVertical: compact ? 8 : 9,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          backgroundColor: selected ? colors.main : colors.card,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: iconOnly ? 0 : compact ? 4 : 6,
        },
        !pressed && !selected ? shadows.sm : null,
      ]}
    >
      {icon}
      {iconOnly ? null : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            fontWeight: '800',
            fontSize: compact ? 11 : 12,
            color: colors.foreground,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function DetailTabBar({ active, onChange }: DetailTabBarProps) {
  const { width } = useWindowDimensions()
  const { contentPadding, tabMinWidth, isCompact } = useResponsive()

  const horizontalPadding = contentPadding
  const available = width - horizontalPadding * 2
  const useEqualWidth = available >= DETAIL_TAB_CONFIG.length * (tabMinWidth + 20)
  const iconOnly = isCompact && !useEqualWidth

  const containerStyle = {
    marginHorizontal: horizontalPadding,
    marginTop: 8,
    marginBottom: 4,
    padding: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.background,
    ...shadows.sm,
  }

  if (useEqualWidth) {
    return (
      <View style={containerStyle}>
        <View style={{ flexDirection: 'row', gap: isCompact ? 4 : 6 }}>
          {DETAIL_TAB_CONFIG.map((tab) => (
            <TabPill
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              selected={tab.id === active}
              onPress={() => onChange(tab.id)}
              equalWidth
              compact={isCompact}
              iconOnly={false}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, maxHeight: 52 }}
        contentContainerStyle={{ gap: 6, alignItems: 'center' }}
      >
        {DETAIL_TAB_CONFIG.map((tab) => (
          <TabPill
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            selected={tab.id === active}
            onPress={() => onChange(tab.id)}
            compact={isCompact}
            iconOnly={iconOnly}
          />
        ))}
      </ScrollView>
    </View>
  )
}