import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import {
  Camera,
  FileText,
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
  { id: 'output', label: 'Output', Icon: FileText },
  { id: 'penerima', label: 'Penerima', Icon: Users },
  { id: 'foto', label: 'Foto', Icon: Camera },
  { id: 'progress', label: 'Progress', Icon: RefreshCcw },
  { id: 'tiket', label: 'Tiket', Icon: MessageSquareText },
]

function TabPill({
  label,
  Icon,
  selected,
  onPress,
  compact,
}: {
  label: string
  Icon: LucideIcon
  selected: boolean
  onPress: () => void
  compact?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          minWidth: compact ? 96 : 108,
          paddingHorizontal: compact ? 10 : 12,
          paddingVertical: 10,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          backgroundColor: selected ? colors.main : colors.card,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: compact ? 5 : 7,
        },
        !pressed && !selected ? shadows.sm : null,
      ]}
    >
      <Icon size={compact ? 15 : 16} color={colors.foreground} strokeWidth={2.5} />
      <Text
        numberOfLines={1}
        style={{
          fontWeight: '800',
          fontSize: compact ? 12 : 13,
          color: colors.foreground,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function DetailTabBar({ active, onChange }: DetailTabBarProps) {
  const { width } = useWindowDimensions()
  const { contentPadding, isCompact } = useResponsive()

  const horizontalPadding = contentPadding
  const containerStyle = {
    marginHorizontal: horizontalPadding,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.background,
    ...shadows.sm,
  }

  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          gap: isCompact ? 6 : 8,
          alignItems: 'center',
          paddingHorizontal: 2,
          minWidth: width - horizontalPadding * 2 - 16,
        }}
      >
        {DETAIL_TAB_CONFIG.map((tab) => (
          <TabPill
            key={tab.id}
            label={tab.label}
            Icon={tab.Icon}
            selected={tab.id === active}
            onPress={() => onChange(tab.id)}
            compact={isCompact}
          />
        ))}
      </ScrollView>
    </View>
  )
}