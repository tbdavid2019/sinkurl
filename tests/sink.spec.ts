import { describe, expect, it } from 'vitest'
import { fetch } from './utils'

describe('/', () => {
  it('returns 200 or redirect for homepage request', async () => {
    const response = await fetch('/', { redirect: 'manual' })
    expect([200, 302]).toContain(response.status)
  })
})
