import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'

type Link = z.infer<typeof LinkSchema>

interface UrlIndex {
  slug: string
  url: string
}

async function getUrlIndexKey(url: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url))
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return `url-index:${hash}`
}

export async function findRandomLinkByUrl(KV: KVNamespace, url: string): Promise<Link | null> {
  const key = await getUrlIndexKey(url)
  const index = await KV.get<UrlIndex>(key, { type: 'json' })

  if (!index || index.url !== url)
    return null

  const link = await KV.get<Link>(`link:${index.slug}`, { type: 'json' })
  if (link && link.url === url && !link.isCustomSlug)
    return link

  await KV.delete(key)
  return null
}

export async function putRandomLinkUrlIndex(KV: KVNamespace, link: Link, expiration?: number) {
  if (link.isCustomSlug)
    return

  const key = await getUrlIndexKey(link.url)
  await KV.put(key, JSON.stringify({ slug: link.slug, url: link.url }), { expiration })
}

export async function deleteRandomLinkUrlIndex(KV: KVNamespace, link: Link) {
  if (link.isCustomSlug)
    return

  const key = await getUrlIndexKey(link.url)
  const index = await KV.get<UrlIndex>(key, { type: 'json' })
  if (index?.slug === link.slug && index.url === link.url)
    await KV.delete(key)
}
