import { TrackingSettingsSchema } from '@@/schemas/settings'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  if (!cloudflare) {
    return TrackingSettingsSchema.parse({})
  }

  const { KV } = cloudflare.env
  const setting = await KV.get('setting:tracking', { type: 'json' })
  return TrackingSettingsSchema.parse(setting || {})
})
