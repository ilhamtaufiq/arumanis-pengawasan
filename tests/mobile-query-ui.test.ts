import { describe, expect, test } from 'bun:test'
import {
  shouldShowInitialQuerySpinner,
  shouldShowQueryEmptyFallback,
} from '../apps/mobile/lib/query-ui'

describe('query-ui', () => {
  test('shouldShowInitialQuerySpinner only while first fetch without data', () => {
    expect(
      shouldShowInitialQuerySpinner({
        data: undefined,
        isError: false,
        isFetching: true,
        fetchStatus: 'fetching',
        isPlaceholderData: false,
      }),
    ).toBe(true)

    expect(
      shouldShowInitialQuerySpinner({
        data: { data: [] },
        isError: false,
        isFetching: true,
        fetchStatus: 'fetching',
        isPlaceholderData: true,
      }),
    ).toBe(false)
  })

  test('shouldShowQueryEmptyFallback when offline paused without cache', () => {
    expect(
      shouldShowQueryEmptyFallback({
        data: undefined,
        isError: false,
        isFetching: false,
        fetchStatus: 'paused',
        isPlaceholderData: false,
      }),
    ).toBe(true)
  })
})