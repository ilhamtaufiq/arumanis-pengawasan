import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import {
  Camera,
  MessageSquareText,
  RefreshCcw,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react-native'
import { type DetailTabId } from '@/lib/pekerjaan-helpers'
import { useResponsive } from '@/lib/responsive'
import { colors, radius, shadows } from '@/theme/tokens'

type DetailTabBarProps = {
  active: DetailTabId
  onChange: (tab: DetailTabId) => void
}

const DETAIL_TAB_CONFIG: Array<{ id: DetailTabId; label: string; Icon: LucideIcon }> = [
  { id: 'ringkasan', label: 'Ringkasan', Icon: Shield },
  { id: 'progress', label: 'Progress', Icon: RefreshCcw },
  { id: 'penerima', label: 'Penerima', Icon: Users },
  { id: 'foto', label: 'Foto', Icon: Camera },
  { id: 'tiket', label: 'Tiket', Icon: MessageSquareText },
]

function TabPill({
  label,
  Icon,
  selected,
  onPress,
  equalWidth,
  compact,
  iconOnly,
}: {
  label: string
  Icon: LucideIcon
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
      <Icon size={14} color={colors.foreground} strokeWidth={2.5} />
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
              Icon={tab.Icon}
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
            Icon={tab.Icon}
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