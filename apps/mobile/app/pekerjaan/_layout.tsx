import { Stack } from 'expo-router'
import { AppHeader } from '@/components/AppHeader'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'
import { colors } from '@/theme/tokens'

export const ErrorBoundary = createRouteErrorBoundary('Detail pekerjaan')

export default function PekerjaanLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          header: () => <AppHeader title="Detail Pekerjaan" showBack />,
        }}
      />
    </Stack>
  )
}