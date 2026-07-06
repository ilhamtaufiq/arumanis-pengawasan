import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui'
import { View } from 'react-native'

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Spinner label="Memeriksa sesi..." />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}