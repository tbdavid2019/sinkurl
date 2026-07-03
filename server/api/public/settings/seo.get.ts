import { SeoSettingsSchema } from '@@/schemas/settings'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  if (!cloudflare) {
    return SeoSettingsSchema.parse({})
  }

  const { KV } = cloudflare.env
  const setting = await KV.get('setting:seo', { type: 'json' })
  return SeoSettingsSchema.parse(setting || {})
})
