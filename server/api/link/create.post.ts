import { LinkSchema } from '@@/schemas/link'
import { findRandomLinkByUrl, putRandomLinkUrlIndex } from '@@/server/utils/link-index'

defineRouteMeta({
  openAPI: {
    description: 'Create a new short link',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          // Need: https://github.com/nitrojs/nitro/issues/2974
          schema: {
            type: 'object',
            required: ['url'],
            properties: {
              url: {
                type: 'string',
                description: 'The URL to shorten',
              },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  const { caseSensitive } = useRuntimeConfig(event)

  if (!caseSensitive) {
    link.slug = link.slug.toLowerCase()
  }

  const { reserveSlug } = useAppConfig(event)
  if (reserveSlug && reserveSlug.includes(link.slug)) {
    throw createError({
      status: 400,
      statusText: `Slug "${link.slug}" is a reserved system route`,
    })
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  if (!link.isCustomSlug) {
    const existingRandomLink = await findRandomLinkByUrl(KV, link.url)
    if (existingRandomLink) {
      const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${existingRandomLink.slug}`
      return { link: existingRandomLink, shortLink, status: 'existing' }
    }
  }

  const existingLink = await KV.get(`link:${link.slug}`)
  if (existingLink) {
    throw createError({
      status: 409, // Conflict
      statusText: 'Link already exists',
    })
  }

  else {
    const expiration = getExpiration(event, link.expiration)

    await KV.put(`link:${link.slug}`, JSON.stringify(link), {
      expiration,
      metadata: {
        expiration,
        url: link.url,
        comment: link.comment,
      },
    })
    await putRandomLinkUrlIndex(KV, link, expiration)
    setResponseStatus(event, 201)
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${link.slug}`
    return { link, shortLink }
  }
})
