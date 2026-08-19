import { generateMock } from '@anatine/zod-mock'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fetch, fetchWithAuth } from '../utils'

const testLinkPayload = generateMock(z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50),
}))

describe('/api/link/ai', () => {
  // it('generates AI Slug for valid URL', async () => {
  //   const response = await fetchWithAuth(`/api/link/ai?url=${encodeURIComponent('https://sink.cool')}`)

  //   expect(response.status).toBe(200)

  //   const data = await response.json()
  //   console.log(data)
  // })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/ai')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/create', () => {
  it('creates new link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.link).toBeDefined()
    expect(data.link.url).toBe(testLinkPayload.url)
    expect(data.link.slug).toBe(testLinkPayload.slug)
    expect(data.shortLink).toContain(testLinkPayload.slug)
  })

  it('returns 409 when slug already exists', async () => {
    const slug = `conflict-slug-${Math.random().toString(36).slice(2)}`

    await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/first-conflict-url',
        slug,
        isCustomSlug: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const duplicateResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/second-conflict-url',
        slug,
        isCustomSlug: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(duplicateResponse.status).toBe(409)
  })

  it('reuses a random short link when the destination URL is identical', async () => {
    const suffix = Math.random().toString(36).slice(2)
    const url = `https://example.com/reuse-random-short-link-${suffix}`

    const firstResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url,
        slug: `reuse-random-first-${suffix}`,
        isCustomSlug: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(firstResponse.status).toBe(201)

    const duplicateResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url,
        slug: `reuse-random-second-${suffix}`,
        isCustomSlug: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(duplicateResponse.status).toBe(200)
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      status: 'existing',
      link: {
        slug: `reuse-random-first-${suffix}`,
        url,
        isCustomSlug: false,
      },
    })
  })

  it('allows custom slugs to share a destination URL', async () => {
    const suffix = Math.random().toString(36).slice(2)
    const url = `https://example.com/shared-custom-short-link-${suffix}`

    const firstResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url,
        slug: `shared-custom-first-${suffix}`,
        isCustomSlug: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(firstResponse.status).toBe(201)

    const secondResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({
        url,
        slug: `shared-custom-second-${suffix}`,
        isCustomSlug: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(secondResponse.status).toBe(201)
    await expect(secondResponse.json()).resolves.toMatchObject({
      link: {
        slug: `shared-custom-second-${suffix}`,
        url,
        isCustomSlug: true,
      },
    })
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/create', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/upsert', () => {
  it('creates new link with valid data', async () => {
    const payload = generateMock(z.object({
      url: z.string().url(),
      slug: z.string().min(1).max(50),
    }))

    const response = await fetchWithAuth('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)
  })

  it('updates existing link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/upsert', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/query', () => {
  it('returns link data for valid slug', async () => {
    const response = await fetchWithAuth(`/api/link/query?slug=${testLinkPayload.slug}`)

    expect(response.status).toBe(200)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch(`/api/link/query?slug=${testLinkPayload.slug}`)

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/list', () => {
  it('returns paginated link list with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/list')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('links')
    expect(data.links).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/list')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/count', () => {
  it('returns the total number of links and updates after create/delete', async () => {
    const payload = generateMock(z.object({
      url: z.string().url(),
      slug: z.string().min(1).max(50),
    }))

    const beforeResponse = await fetchWithAuth('/api/link/count')
    expect(beforeResponse.status).toBe(200)
    const beforeData = await beforeResponse.json()
    expect(beforeData.count).toEqual(expect.any(Number))

    const createResponse = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(createResponse.status).toBe(201)

    const afterCreateResponse = await fetchWithAuth('/api/link/count')
    expect(afterCreateResponse.status).toBe(200)
    const afterCreateData = await afterCreateResponse.json()
    expect(afterCreateData.count).toBe(beforeData.count + 1)

    const deleteResponse = await fetchWithAuth('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({ slug: payload.slug }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(deleteResponse.status).toBe(204)

    const afterDeleteResponse = await fetchWithAuth('/api/link/count')
    expect(afterDeleteResponse.status).toBe(200)
    const afterDeleteData = await afterDeleteResponse.json()
    expect(afterDeleteData.count).toBe(beforeData.count)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/count')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/search', () => {
  it('returns link array with valid auth', async () => {
    const response = await fetchWithAuth('/api/link/search')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/search')

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/edit', () => {
  it('updates existing link with valid data', async () => {
    const response = await fetchWithAuth('/api/link/edit', {
      method: 'PUT',
      body: JSON.stringify(testLinkPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(201)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/edit', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})

describe.sequential('/api/link/delete', () => {
  it('deletes link with valid slug and auth', async () => {
    const response = await fetchWithAuth('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({ slug: testLinkPayload.slug }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(204)
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/link/delete', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })
})
