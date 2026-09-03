import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

function isValidHttpUrl(val: string) {
  try {
    const parsed = new URL(val)
    return ['http:', 'https:'].includes(parsed.protocol)
  }
  catch {
    return false
  }
}

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  url: z.string().trim().url().max(2048).refine(isValidHttpUrl, {
    message: 'URL must use http:// or https://',
  }),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)).default(nanoid()),
  isCustomSlug: z.boolean().default(false),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().refine(expiration => expiration > Math.floor(Date.now() / 1000), {
    message: 'expiration must be greater than current time',
    path: ['expiration'],
  }).optional(),
  title: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).refine(isValidHttpUrl, {
    message: 'Image URL must use http:// or https://',
  }).optional(),
  transitionMode: z.enum(['inherit', 'on', 'off']).default('inherit'),
  transitionHtml: z.string().trim().max(10000).optional(),
  ogMode: z.enum(['inherit', 'custom', 'passthrough']).default('inherit'),
})
