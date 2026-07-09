import { afterEach, describe, expect, test } from 'bun:test'
import {
  getOtaUpdatePhase,
  resetOtaUpdatePhase,
  setOtaUpdatePhase,
  subscribeOtaUpdatePhase,
} from '../apps/mobile/lib/ota-update-status'

describe('mobile ota update status', () => {
  afterEach(() => {
    resetOtaUpdatePhase()
  })

  test('tracks phase transitions for UI animation', () => {
    const seen: string[] = []
    const unsubscribe = subscribeOtaUpdatePhase((phase) => {
      seen.push(phase)
    })

    setOtaUpdatePhase('checking')
    setOtaUpdatePhase('downloading')
    setOtaUpdatePhase('ready')
    setOtaUpdatePhase('applying')

    unsubscribe()

    expect(seen).toEqual(['idle', 'checking', 'downloading', 'ready', 'applying'])
    expect(getOtaUpdatePhase()).toBe('applying')
  })

  test('ignores duplicate phase updates', () => {
    let count = 0
    const unsubscribe = subscribeOtaUpdatePhase(() => {
      count += 1
    })

    setOtaUpdatePhase('checking')
    setOtaUpdatePhase('checking')
    setOtaUpdatePhase('downloading')

    unsubscribe()

    expect(count).toBe(3)
  })
})