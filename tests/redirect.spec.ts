import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from './utils'

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

describe.sequential('transition redirect behavior', () => {
  it('shows the transition page when a link explicitly enables it', async () => {
    const slug = uniqueSlug('transition-on')

    await fetchWithAuth('/api/settings/transition', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'disabled',
        content: '',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/transition-on',
        slug,
        transitionMode: 'on',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('Redirecting in')
  })

  it('respects a link opt-out when global mode is default', async () => {
    const slug = uniqueSlug('transition-off')

    await fetchWithAuth('/api/settings/transition', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'inherit',
        content: '<p>global transition</p>',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/direct',
        slug,
        transitionMode: 'off',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toBe('https://example.com/direct')
  })

  it('forces the transition page for all links when global mode is force', async () => {
    const slug = uniqueSlug('transition-force')

    await fetchWithAuth('/api/settings/transition', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'force',
        content: '<p>forced transition</p>',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/forced',
        slug,
        transitionMode: 'off',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('forced transition')
  })
})
