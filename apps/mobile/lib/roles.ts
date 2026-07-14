import type { AuthUser } from '@pengawas/shared'

function roleNames(user: AuthUser | null | undefined): string[] {
  if (!user?.roles?.length) return []
  return user.roles
    .map((role) => (typeof role === 'string' ? role : role?.name))
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase())
}

export function hasRole(user: AuthUser | null | undefined, role: string) {
  return roleNames(user).includes(role.toLowerCase())
}

/** Admin / manager: backend byUserRole = lihat semua pekerjaan. */
export function isElevatedUser(user: AuthUser | null | undefined) {
  const names = roleNames(user)
  return names.includes('admin') || names.includes('manager') || names.includes('super-admin')
}

export function isAdminUser(user: AuthUser | null | undefined) {
  return hasRole(user, 'admin') || hasRole(user, 'super-admin')
}

export function primaryRoleLabel(user: AuthUser | null | undefined) {
  const names = roleNames(user)
  if (!names.length) return 'Pengguna'
  if (names.includes('admin') || names.includes('super-admin')) return 'Admin'
  if (names.includes('manager')) return 'Manager'
  if (names.includes('pengawas')) return 'Pengawas'
  if (names.includes('tfl')) return 'TFL'
  return user?.roles?.[0]?.name ?? 'Pengguna'
}

/**
 * Deskripsi cakupan data pekerjaan di dashboard/list.
 * Backend: admin lihat semua; selain itu filter user_pekerjaan + kegiatan_role.
 */
export function pekerjaanScopeDescription(user: AuthUser | null | undefined) {
  if (isElevatedUser(user)) {
    return 'Menampilkan seluruh pekerjaan (akses admin/manager).'
  }
  return 'Menampilkan pekerjaan yang ditugaskan ke akun Anda.'
}
