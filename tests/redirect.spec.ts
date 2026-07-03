import { beforeEach, describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from './utils'

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

describe.sequential('transition redirect behavior', () => {
  beforeEach(async () => {
    await fetchWithAuth('/api/settings/tracking', {
      method: 'POST',
      body: JSON.stringify({
        enabled: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    await fetchWithAuth('/api/settings/seo', {
      method: 'POST',
      body: JSON.stringify({
        title: '',
        description: '',
        image: '',
        siteName: '',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

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

  it('redirects directly for inherited links when global mode is default', async () => {
    const slug = uniqueSlug('transition-inherit-default')

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
        url: 'https://example.com/inherit-default',
        slug,
        transitionMode: 'inherit',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    expect(response.headers.get('location')).toBe('https://example.com/inherit-default')
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

  it('injects tracking integrations on the transition page', async () => {
    const slug = uniqueSlug('transition-tracking')

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

    await fetchWithAuth('/api/settings/tracking', {
      method: 'POST',
      body: JSON.stringify({
        enabled: true,
        gaMeasurementId: 'G-TEST1234',
        metaPixelId: '1234567890',
        lineLiffId: '1234567890-AbcdEfgh',
        lineChannelId: '1234567890',
        requireLineLogin: true,
        redirectDelaySeconds: 3,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/tracked',
        slug,
        transitionMode: 'on',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234')
    expect(html).toContain('https://connect.facebook.net/en_US/fbevents.js')
    expect(html).toContain('https://static.line-scdn.net/liff/edge/2/sdk.js')
    expect(html).toContain('/api/tracking/event')
    expect(html).toContain('"requireLineLogin":true')
    expect(html).toContain('"redirectDelaySeconds":3')
  })

  it('serves Open Graph metadata to social preview crawlers without redirecting', async () => {
    const slug = uniqueSlug('og-preview')

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/og-target',
        slug,
        title: 'Link OG Title',
        description: 'Link OG Description',
        image: 'https://example.com/og.jpg',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
      },
      redirect: 'manual',
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(html).toContain('<meta property="og:title" content="Link OG Title">')
    expect(html).toContain('<meta property="og:description" content="Link OG Description">')
    expect(html).toContain('<meta property="og:image" content="https://example.com/og.jpg">')
    expect(html).toContain('https://example.com/og-target')
  })

  it('falls back to site seo settings for social preview crawlers', async () => {
    const slug = uniqueSlug('og-site-fallback')

    await fetchWithAuth('/api/settings/seo', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Site OG Title',
        description: 'Site OG Description',
        image: 'https://example.com/site-og.jpg',
        siteName: 'Site Name',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/site-fallback',
        slug,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(createResponse.status).toBe(201)

    const response = await fetch(`/${slug}`, {
      headers: {
        'User-Agent': 'Line/15.0.0',
      },
      redirect: 'manual',
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('<meta property="og:title" content="Site OG Title">')
    expect(html).toContain('<meta property="og:description" content="Site OG Description">')
    expect(html).toContain('<meta property="og:image" content="https://example.com/site-og.jpg">')
    expect(html).toContain('<meta property="og:site_name" content="Site Name">')
  })
})
