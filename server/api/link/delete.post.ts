import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { deleteRandomLinkUrlIndex } from '@@/server/utils/link-index'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }
  const { slug } = await readBody(event)
  if (slug) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const link: z.infer<typeof LinkSchema> | null = await KV.get(`link:${slug}`, { type: 'json' })
    if (link)
      await deleteRandomLinkUrlIndex(KV, link)
    await KV.delete(`link:${slug}`)
  }
})
