import { TrackingSettingsSchema } from '@@/schemas/settings'
import { z } from 'zod'

const TrackingEventSchema = z.object({
  event: z.enum(['transition_view', 'redirect_auto', 'redirect_now', 'redirect_stopped', 'line_login_success', 'line_login_error']),
  slug: z.string().trim().max(2048).optional(),
  target: z.string().trim().url().max(2048).optional(),
  lineIdToken: z.string().trim().max(4096).optional(),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, TrackingEventSchema.parse)
  const { cloudflare } = event.context
  if (!cloudflare) {
    return { success: true }
  }

  const { KV } = cloudflare.env
  const setting = TrackingSettingsSchema.parse(await KV.get('setting:tracking', { type: 'json' }) || {})
  if (!setting.enabled) {
    return { success: true }
  }

  let lineUserId = ''
  if (body.lineIdToken && setting.lineChannelId) {
    const form = new URLSearchParams()
    form.set('id_token', body.lineIdToken)
    form.set('client_id', setting.lineChannelId)

    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })

    if (!response.ok) {
      throw createError({
        status: 401,
        statusText: 'LINE ID token verification failed',
      })
    }

    const profile = await response.json() as { sub?: string }
    lineUserId = profile.sub || ''
  }

  if (process.env.NODE_ENV === 'production') {
    await hubAnalytics().put({
      indexes: [body.slug || 'transition'],
      blobs: [
        'tracking_event',
        body.event,
        body.slug || '',
        body.target || '',
        lineUserId,
        getHeader(event, 'user-agent') || '',
        getHeader(event, 'referer') || '',
      ],
      doubles: [Date.now()],
    })
  }

  return { success: true }
})
