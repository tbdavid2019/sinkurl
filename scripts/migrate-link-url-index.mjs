import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const apiBase = 'https://api.cloudflare.com/client/v4'
const execFileAsync = promisify(execFile)

function urlIndexKey(url) {
  const hash = createHash('sha256').update(url).digest('hex')
  return `url-index:${hash}`
}

function isEarlierLink(candidate, current) {
  const candidateCreatedAt = candidate.value.createdAt ?? Number.MAX_SAFE_INTEGER
  const currentCreatedAt = current.value.createdAt ?? Number.MAX_SAFE_INTEGER

  return candidateCreatedAt < currentCreatedAt
    || (candidateCreatedAt === currentCreatedAt && candidate.value.slug.localeCompare(current.value.slug) < 0)
}

/**
 * @param {{ key: string, value: Record<string, unknown>, expiration?: number, metadata?: unknown }[]} records
 */
export function buildMigrationEntries(records) {
  const writes = []
  const earliestRandomLinkByUrl = new Map()
  let markedRandomLinks = 0
  let skippedLinks = 0

  for (const record of records) {
    if (typeof record.value.slug !== 'string' || typeof record.value.url !== 'string') {
      skippedLinks++
      continue
    }

    const link = { ...record.value }
    if (link.isCustomSlug === undefined) {
      link.isCustomSlug = false
      writes.push({
        key: record.key,
        value: JSON.stringify(link),
        ...(record.expiration ? { expiration: record.expiration } : {}),
        ...(record.metadata === undefined ? {} : { metadata: record.metadata }),
      })
      markedRandomLinks++
    }

    if (link.isCustomSlug === true)
      continue

    const candidate = { ...record, value: link }
    const current = earliestRandomLinkByUrl.get(link.url)
    if (!current || isEarlierLink(candidate, current))
      earliestRandomLinkByUrl.set(link.url, candidate)
  }

  for (const [url, record] of earliestRandomLinkByUrl) {
    writes.push({
      key: urlIndexKey(url),
      value: JSON.stringify({ slug: record.value.slug, url }),
      ...(record.expiration ? { expiration: record.expiration } : {}),
    })
  }

  return {
    writes,
    markedRandomLinks,
    indexedUrls: earliestRandomLinkByUrl.size,
    skippedLinks,
  }
}

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value)
    throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function cloudflareRequest(accountId, apiToken, path, options = {}) {
  const response = await fetch(`${apiBase}/accounts/${accountId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...options.headers,
    },
  })
  const body = await response.json()
  if (!response.ok || !body.success) {
    const errors = body.errors?.map(error => error.message).join(', ') || response.statusText
    throw new Error(`${options.method || 'GET'} ${path} failed: ${errors}`)
  }
  return body
}

async function getLinkRecords(accountId, apiToken, namespaceId) {
  const records = []
  let cursor

  do {
    const query = new URLSearchParams({ prefix: 'link:', limit: '1000' })
    if (cursor)
      query.set('cursor', cursor)
    const page = await cloudflareRequest(accountId, apiToken, `/storage/kv/namespaces/${namespaceId}/keys?${query}`)
    const keys = page.result || []

    for (const keyBatch of chunks(keys.map(key => key.name), 100)) {
      const result = await cloudflareRequest(accountId, apiToken, `/storage/kv/namespaces/${namespaceId}/bulk/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keyBatch, type: 'json', withMetadata: true }),
      })
      for (const [key, record] of Object.entries(result.result?.values || {})) {
        if (record && typeof record === 'object' && 'value' in record && record.value && typeof record.value === 'object') {
          records.push({
            key,
            value: record.value,
            ...(record.expiration ? { expiration: record.expiration } : {}),
            ...(record.metadata === undefined ? {} : { metadata: record.metadata }),
          })
        }
      }
    }

    cursor = page.result_info?.cursor
  } while (cursor)

  return records
}

async function runWrangler(accountId, args) {
  const { stdout } = await execFileAsync(
    './node_modules/.bin/wrangler',
    args,
    {
      cwd: process.cwd(),
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId },
    },
  )
  return stdout
}

async function getLinkRecordsViaWrangler(accountId, binding) {
  const stdout = await runWrangler(accountId, [
    'kv',
    'key',
    'list',
    '--binding',
    binding,
    '--prefix',
    'link:',
    '--remote',
  ])
  const keys = JSON.parse(stdout)
  const records = []

  for (const key of keys) {
    const value = JSON.parse(await runWrangler(accountId, [
      'kv',
      'key',
      'get',
      key.name,
      '--binding',
      binding,
      '--text',
      '--remote',
    ]))
    records.push({
      key: key.name,
      value,
      ...(key.metadata === undefined ? {} : { metadata: key.metadata }),
    })
  }

  return records
}

async function writeMigrationViaWrangler(accountId, binding, writes) {
  if (!writes.length)
    return

  const directory = await mkdtemp(join(tmpdir(), 'sinkurl-link-index-'))
  const filename = join(directory, 'migration.json')
  try {
    await writeFile(filename, JSON.stringify(writes))
    await runWrangler(accountId, [
      'kv',
      'bulk',
      'put',
      filename,
      '--binding',
      binding,
      '--remote',
    ])
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const useWrangler = process.argv.includes('--wrangler')
  const binding = process.env.KV_BINDING || 'KV'

  let records
  if (useWrangler) {
    const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID')
    records = await getLinkRecordsViaWrangler(accountId, binding)
  }
  else {
    const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = requiredEnv('CLOUDFLARE_API_TOKEN')
    const namespaceId = requiredEnv('KV_NAMESPACE_ID')
    records = await getLinkRecords(accountId, apiToken, namespaceId)
  }

  const migration = buildMigrationEntries(records)

  console.log(`Scanned ${records.length} link records.`)
  console.log(`Will mark ${migration.markedRandomLinks} untagged links as random and create ${migration.indexedUrls} URL indexes.`)
  if (migration.skippedLinks)
    console.warn(`Skipped ${migration.skippedLinks} invalid link records.`)

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to write the migration.')
    return
  }

  if (useWrangler) {
    const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID')
    await writeMigrationViaWrangler(accountId, binding, migration.writes)
  }
  else {
    const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = requiredEnv('CLOUDFLARE_API_TOKEN')
    const namespaceId = requiredEnv('KV_NAMESPACE_ID')
    for (const writeBatch of chunks(migration.writes, 10_000)) {
      const response = await cloudflareRequest(accountId, apiToken, `/storage/kv/namespaces/${namespaceId}/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(writeBatch),
      })
      if (response.result?.unsuccessful_keys?.length)
        throw new Error(`Migration could not write: ${response.result.unsuccessful_keys.join(', ')}`)
    }
  }

  console.log(`Migration complete: wrote ${migration.writes.length} KV records.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main()
