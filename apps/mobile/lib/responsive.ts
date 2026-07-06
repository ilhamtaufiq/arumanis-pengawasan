import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useResponsive() {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const isNarrow = width < 360
  const isCompact = width < 420
  const isTablet = width >= 768

  return {
    width,
    height,
    insets,
    isNarrow,
    isCompact,
    isTablet,
    contentPadding: isCompact ? 12 : 16,
    maxContentWidth: isTablet ? Math.min(720, width - 32) : width,
    tabMinWidth: isNarrow ? 64 : 72,
  }
}