import { z } from 'zod'

export const EnterpriseSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  companyName: z.string().trim().max(100).default(''),
  content: z.string().trim().max(50000).default(''),
})

export const TransitionSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  content: z.string().trim().max(50000).default(''),
})
