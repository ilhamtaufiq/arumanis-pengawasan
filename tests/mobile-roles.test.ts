import { describe, expect, test } from 'bun:test'
import {
  isAdminUser,
  isElevatedUser,
  pekerjaanScopeDescription,
  primaryRoleLabel,
} from '../apps/mobile/lib/roles'
import type { AuthUser } from '@pengawas/shared'

function user(roles: string[]): AuthUser {
  return {
    id: 1,
    name: 'Test',
    email: 't@example.com',
    roles: roles.map((name) => ({ name })),
  }
}

describe('mobile roles', () => {
  test('elevated admin sees all-scope copy', () => {
    const admin = user(['admin'])
    expect(isElevatedUser(admin)).toBe(true)
    expect(isAdminUser(admin)).toBe(true)
    expect(primaryRoleLabel(admin)).toBe('Admin')
    expect(pekerjaanScopeDescription(admin)).toContain('seluruh pekerjaan')
  })

  test('pengawas is scoped to assignments', () => {
    const pengawas = user(['pengawas'])
    expect(isElevatedUser(pengawas)).toBe(false)
    expect(primaryRoleLabel(pengawas)).toBe('Pengawas')
    expect(pekerjaanScopeDescription(pengawas)).toContain('ditugaskan')
  })
})
