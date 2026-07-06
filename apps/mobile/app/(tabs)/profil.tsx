import { ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatCurrency, formatNumber } from '@pengawas/shared/format'
import { getPengawasList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { NeoBadge, NeoButton, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function ProfilScreen() {
  const { user, logout, isLoading, canFetch } = useAuth()

  const pengawasQuery = useQuery({
    queryKey: queryKeys.pengawas.list(),
    queryFn: getPengawasList,
    enabled: canFetch,
  })

  const matched =
    pengawasQuery.data?.find((item) => item.nip && item.nip === user?.nip) ?? null

  if (isLoading || !user) {
    return <Spinner label="Memuat profil..." />
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SectionHeader title="Profil" description="Identitas pengawas yang sedang login." />

      <NeoSurface style={{ gap: 10 }}>
        <Row label="Nama" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="NIP" value={user.nip || '-'} />
        <Row
          label="Role"
          value={Array.isArray(user.roles) && user.roles.length ? (user.roles[0]?.name ?? '-') : '-'}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {(user.permissions || []).slice(0, 6).map((permission) => (
            <NeoBadge key={permission.name} tone="info">
              {permission.name}
            </NeoBadge>
          ))}
        </View>
      </NeoSurface>

      {matched ? (
        <NeoSurface tone="main" style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>Data Pengawas</Text>
          <Row label="Nama" value={matched.nama} />
          <Row label="Lokasi" value={formatNumber(matched.jumlah_lokasi)} />
          <Row label="Total Pagu" value={formatCurrency(matched.total_pagu)} />
        </NeoSurface>
      ) : null}

      <NeoButton label="Keluar" variant="danger" onPress={() => void logout()} />
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{value}</Text>
    </View>
  )
}