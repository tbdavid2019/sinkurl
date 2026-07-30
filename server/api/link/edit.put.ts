import type { z } from 'zod'
import { LinkSchema } from '@@/schemas/link'
import { deleteRandomLinkUrlIndex, findRandomLinkByUrl, putRandomLinkUrlIndex } from '@@/server/utils/link-index'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    })
  }
  const link = await readValidatedBody(event, LinkSchema.parse)
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.slug}`, { type: 'json' })
  if (existingLink) {
    const newLink = {
      ...existingLink,
      ...link,
      id: existingLink.id, // don't update id
      isCustomSlug: existingLink.isCustomSlug ?? false,
      createdAt: existingLink.createdAt, // don't update createdAt
      updatedAt: Math.floor(Date.now() / 1000),
    }

    if (!newLink.isCustomSlug && newLink.url !== existingLink.url) {
      const existingRandomLink = await findRandomLinkByUrl(KV, newLink.url)
      if (existingRandomLink && existingRandomLink.slug !== newLink.slug) {
        throw createError({
          status: 409,
          statusText: 'A random short link already exists for this URL',
        })
      }
    }

    const expiration = getExpiration(event, newLink.expiration)
    await deleteRandomLinkUrlIndex(KV, existingLink)
    await KV.put(`link:${newLink.slug}`, JSON.stringify(newLink), {
      expiration,
      metadata: {
        expiration,
        url: newLink.url,
        comment: newLink.comment,
      },
    })
    await putRandomLinkUrlIndex(KV, newLink, expiration)
    setResponseStatus(event, 201)
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${newLink.slug}`
    return { link: newLink, shortLink }
  }
})
