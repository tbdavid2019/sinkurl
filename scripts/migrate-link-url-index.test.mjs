import assert from 'node:assert/strict'
import { it } from 'vitest'
import { buildMigrationEntries } from './migrate-link-url-index.mjs'

it('marks untagged links as random and indexes the earliest link for each URL', () => {
  const result = buildMigrationEntries([
    {
      key: 'link:s9',
      value: {
        slug: 's9',
        url: 'https://example.com/a',
        createdAt: 20,
      },
    },
    {
      key: 'link:s1',
      value: {
        slug: 's1',
        url: 'https://example.com/a',
        createdAt: 10,
      },
      expiration: 2_000_000_000,
      metadata: { url: 'https://example.com/a' },
    },
    {
      key: 'link:custom',
      value: {
        slug: 'custom',
        url: 'https://example.com/a',
        isCustomSlug: true,
        createdAt: 1,
      },
    },
  ])

  assert.equal(result.markedRandomLinks, 2)
  assert.equal(result.indexedUrls, 1)
  assert.deepEqual(result.writes.find(entry => entry.key === 'link:s1'), {
    key: 'link:s1',
    value: JSON.stringify({
      slug: 's1',
      url: 'https://example.com/a',
      createdAt: 10,
      isCustomSlug: false,
    }),
    expiration: 2_000_000_000,
    metadata: { url: 'https://example.com/a' },
  })
  assert.deepEqual(result.writes.find(entry => entry.key.startsWith('url-index:')), {
    key: 'url-index:2dce0a4c50441bfccfa9caf4b58c3cba6e06c420505dd829f0436de1aa44baac',
    value: JSON.stringify({ slug: 's1', url: 'https://example.com/a' }),
    expiration: 2_000_000_000,
  })
})
