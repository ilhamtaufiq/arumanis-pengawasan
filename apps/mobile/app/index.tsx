import { Redirect } from 'expo-router'
import { View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <Spinner label="Memeriksa sesi..." />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}