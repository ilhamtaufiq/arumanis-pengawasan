import { memo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
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

const TabPill = memo(function TabPill({
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
      hitSlop={8}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: compact ? 88 : 100,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: 8,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius,
          backgroundColor: selected ? colors.main : colors.card,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: compact ? 4 : 6,
        },
        !pressed && !selected ? shadows.sm : null,
      ]}
    >
      <Icon size={compact ? 14 : 15} color={colors.foreground} strokeWidth={2.5} />
      <Text
        numberOfLines={1}
        style={{
          fontWeight: '800',
          fontSize: compact ? 11 : 12,
          color: colors.foreground,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
})

export const DetailTabBar = memo(function DetailTabBar({ active, onChange }: DetailTabBarProps) {
  const { contentPadding, isCompact } = useResponsive()

  const handleRingkasan = useCallback(() => onChange('ringkasan'), [onChange])
  const handleOutput = useCallback(() => onChange('output'), [onChange])
  const handlePenerima = useCallback(() => onChange('penerima'), [onChange])
  const handleFoto = useCallback(() => onChange('foto'), [onChange])
  const handleProgress = useCallback(() => onChange('progress'), [onChange])
  const handleTiket = useCallback(() => onChange('tiket'), [onChange])

  const handlers: Record<DetailTabId, () => void> = {
    ringkasan: handleRingkasan,
    output: handleOutput,
    penerima: handlePenerima,
    foto: handleFoto,
    progress: handleProgress,
    tiket: handleTiket,
  }

  return (
    <View
      style={{
        marginHorizontal: contentPadding,
        marginTop: 8,
        marginBottom: 4,
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.background,
        ...shadows.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: isCompact ? 6 : 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {DETAIL_TAB_CONFIG.map((tab) => (
          <TabPill
            key={tab.id}
            label={tab.label}
            Icon={tab.Icon}
            selected={tab.id === active}
            onPress={handlers[tab.id]}
            compact={isCompact}
          />
        ))}
      </View>
    </View>
  )
})