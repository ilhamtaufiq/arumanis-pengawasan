import { Pressable, Text, View } from 'react-native'
import { colors } from '@/theme/tokens'

type PaginationBarProps = {
  currentPage: number
  lastPage: number
  total?: number
  onPrevious: () => void
  onNext: () => void
  disabled?: boolean
}

export function PaginationBar({
  currentPage,
  lastPage,
  total,
  onPrevious,
  onNext,
  disabled = false,
}: PaginationBarProps) {
  if (lastPage <= 1) return null

  return (
    <View style={{ gap: 8 }}>
      {total != null ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, textAlign: 'center' }}>
          {total} item · halaman {currentPage}/{lastPage}
        </Text>
      ) : (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground, textAlign: 'center' }}>
          Halaman {currentPage}/{lastPage}
        </Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Pressable
          disabled={disabled || currentPage <= 1}
          onPress={onPrevious}
          style={{
            flex: 1,
            opacity: disabled || currentPage <= 1 ? 0.5 : 1,
            borderWidth: 2,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700' }}>Sebelumnya</Text>
        </Pressable>
        <Pressable
          disabled={disabled || currentPage >= lastPage}
          onPress={onNext}
          style={{
            flex: 1,
            opacity: disabled || currentPage >= lastPage ? 0.5 : 1,
            borderWidth: 2,
            borderColor: colors.border,
            backgroundColor: colors.main,
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700' }}>Berikutnya</Text>
        </Pressable>
      </View>
    </View>
  )
}