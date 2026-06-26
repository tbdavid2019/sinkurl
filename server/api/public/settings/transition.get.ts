import { TransitionSettingsSchema } from '@@/schemas/settings'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  if (!cloudflare) {
    return TransitionSettingsSchema.parse({})
  }
  const { KV } = cloudflare.env
  const setting = await KV.get('setting:transition', { type: 'json' })
  return TransitionSettingsSchema.parse(setting || {})
})
