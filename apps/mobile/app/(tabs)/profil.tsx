import { ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatCurrency, formatNumber } from '@pengawas/shared/format'
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation'
import { getPengawasList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isElevatedUser, primaryRoleLabel, pekerjaanScopeDescription } from '@/lib/roles'
import { NeoBadge, NeoButton, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function ProfilScreen() {
  const { user, logout, isLoading, canFetch } = useAuth()
  const backgroundLocation = useBackgroundLocation()
  const elevated = isElevatedUser(user)

  const pengawasQuery = useQuery({
    queryKey: queryKeys.pengawas.list(),
    queryFn: getPengawasList,
    enabled: canFetch && !elevated,
  })

  const matched =
    pengawasQuery.data?.find((item) => item.nip && item.nip === user?.nip) ?? null

  if (isLoading || !user) {
    return <Spinner label="Memuat profil..." />
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SectionHeader
        title="Profil"
        description={
          elevated
            ? 'Akun admin/manager di aplikasi pengawasan lapangan.'
            : 'Identitas pengawas yang sedang login.'
        }
      />

      <NeoSurface style={{ gap: 10 }}>
        <Row label="Nama" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="NIP" value={user.nip || '-'} />
        <Row label="Peran" value={primaryRoleLabel(user)} />
        <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
          {pekerjaanScopeDescription(user)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {(user.roles || []).map((role) => (
            <NeoBadge key={role.name ?? String(role.id)} tone={elevated ? 'info' : 'success'}>
              {role.name ?? 'role'}
            </NeoBadge>
          ))}
          {(user.permissions || []).slice(0, 4).map((permission) => (
            <NeoBadge key={permission.name} tone="neutral">
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

      {backgroundLocation.supported && !elevated ? (
        <NeoSurface style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>Pelacakan GPS</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
            GPS dan izin lokasi wajib aktif saat aplikasi dibuka. Koordinat dikirim ke server saat handphone
            aktif, termasuk saat aplikasi tidak dibuka.
          </Text>
          <Row
            label="Status pelacakan"
            value={
              backgroundLocation.active
                ? 'Aktif mengirim'
                : backgroundLocation.loading
                  ? 'Memeriksa...'
                  : 'Menunggu izin / layanan GPS'
            }
          />
          {backgroundLocation.error ? (
            <Text style={{ fontSize: 12, color: colors.danger }}>{backgroundLocation.error}</Text>
          ) : null}
        </NeoSurface>
      ) : elevated ? (
        <NeoSurface tone="muted" style={{ gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>Lokasi</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
            Akun admin/manager tidak diwajibkan GPS latar. Pelacakan lapangan tetap berlaku untuk pengawas.
          </Text>
        </NeoSurface>
      ) : null}

      <NeoButton label="Keluar" variant="danger" onPress={() => void logout()} fullWidth />
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