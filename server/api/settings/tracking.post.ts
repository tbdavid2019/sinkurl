import { TrackingSettingsSchema } from '@@/schemas/settings'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot modify settings.',
    })
  }

  const setting = await readValidatedBody(event, TrackingSettingsSchema.parse)
  const { cloudflare } = event.context
  if (!cloudflare) {
    throw createError({
      status: 500,
      statusText: 'Cloudflare environment not available',
    })
  }

  const { KV } = cloudflare.env
  await KV.put('setting:tracking', JSON.stringify(setting))

  return { success: true, setting }
})
