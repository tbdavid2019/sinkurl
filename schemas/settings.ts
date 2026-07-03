import { z } from 'zod'

export const EnterpriseSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  companyName: z.string().trim().max(100).default(''),
  content: z.string().trim().max(50000).default(''),
})

export const SeoSettingsSchema = z.object({
  title: z.string().trim().max(120).default(''),
  description: z.string().trim().max(300).default(''),
  image: z.string().trim().url().max(2048).or(z.literal('')).default(''),
  siteName: z.string().trim().max(120).default(''),
})

export const TransitionModeSchema = z.enum(['disabled', 'inherit', 'force'])

export const TransitionSettingsSchema = z.object({
  mode: TransitionModeSchema.optional(),
  enabled: z.boolean().optional(),
  content: z.string().trim().max(50000).default(''),
}).transform(({ mode, enabled, content }) => {
  const normalizedMode = mode ?? (enabled ? 'inherit' : 'disabled')

  return {
    mode: normalizedMode,
    enabled: normalizedMode !== 'disabled',
    content,
  }
})

export const TrackingSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  gaMeasurementId: z.string().trim().max(32).default(''),
  metaPixelId: z.string().trim().max(32).default(''),
  lineLiffId: z.string().trim().max(64).default(''),
  lineChannelId: z.string().trim().max(32).default(''),
  requireLineLogin: z.boolean().default(false),
  redirectDelaySeconds: z.number().int().min(1).max(30).default(5),
})
