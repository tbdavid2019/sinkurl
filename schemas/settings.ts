import { z } from 'zod'

export const EnterpriseSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  companyName: z.string().trim().max(100).default(''),
  content: z.string().trim().max(50000).default(''),
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
