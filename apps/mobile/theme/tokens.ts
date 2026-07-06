/** Token visual dari DESAIN.md — Neobrutalism Arumanis Pengawasan */
export const colors = {
  background: '#fff7e6',
  foreground: '#111111',
  main: '#ffcc00',
  mainForeground: '#111111',
  secondary: '#ff6b6b',
  accent: '#4ade80',
  info: '#38bdf8',
  danger: '#ff3b30',
  muted: '#f4f4f5',
  mutedForeground: '#3f3f46',
  card: '#ffffff',
  border: '#111111',
  rowHover: '#fff1a8',
} as const

export const shadows = {
  sm: { shadowColor: '#111', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  md: { shadowColor: '#111', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  lg: { shadowColor: '#111', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
} as const

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const

export const radius = 6