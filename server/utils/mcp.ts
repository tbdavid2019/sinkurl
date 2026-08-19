import type { H3Event } from 'h3'
import { LinkSchema } from '@@/schemas/link'
import { deleteRandomLinkUrlIndex, findRandomLinkByUrl, putRandomLinkUrlIndex } from '@@/server/utils/link-index'
import { getExpiration } from '@@/server/utils/time'
import { customAlphabet } from 'nanoid'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = {
  name: 'sink-mcp-server',
  version: '0.2.1',
}

export const MCP_TOOLS = [
  {
    name: 'shorten_url',
    description: 'Shorten a destination URL into a fast, trackable short link with optional custom slug, expiration, and notes.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The destination URL to shorten (must include http:// or https://)',
        },
        slug: {
          type: 'string',
          description: 'Optional custom short link slug (e.g. "my-promo-2026"). If omitted, a random slug is generated.',
        },
        expiration: {
          type: 'string',
          description: 'Optional expiration duration (e.g. "1h", "24h", "7d", "30d", "1y") or UNIX timestamp in seconds.',
        },
        comment: {
          type: 'string',
          description: 'Optional note or comment for this short link.',
        },
        title: {
          type: 'string',
          description: 'Optional custom title for social media preview card.',
        },
        description: {
          type: 'string',
          description: 'Optional custom description for social media preview card.',
        },
        isCustomSlug: {
          type: 'boolean',
          description: 'Whether the slug is explicitly custom. Defaults to true if slug is provided, false otherwise.',
        },
        token: {
          type: 'string',
          description: 'Optional Site Token for authentication if required by server configuration.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'lookup_link',
    description: 'Look up destination URL, metadata, creation time, and expiration details of an existing short link by slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the short link to look up (e.g. "my-promo-2026").',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_links',
    description: 'List stored short links with metadata. Requires Site Token authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of links to return (1-100, default: 20).',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor for listing next batch.',
        },
        token: {
          type: 'string',
          description: 'Site Token for authentication (if not provided via Authorization header).',
        },
      },
    },
  },
  {
    name: 'delete_link',
    description: 'Delete an existing short link by slug. Requires Site Token authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the short link to delete.',
        },
        token: {
          type: 'string',
          description: 'Site Token for authentication (if not provided via Authorization header).',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_link_analytics',
    description: 'Query access metrics and view statistics for a short link. Requires Site Token authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the short link to query stats for.',
        },
        interval: {
          type: 'string',
          enum: ['24h', '7d', '30d', 'all'],
          description: 'Time range interval for stats (default: "7d").',
        },
        token: {
          type: 'string',
          description: 'Site Token for authentication (if not provided via Authorization header).',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_service_info',
    description: 'Get Sink shortlink service status, version, and WebMCP capabilities.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

export const MCP_RESOURCES = [
  {
    uri: 'sink://info',
    name: 'Service Info',
    description: 'General system status and configuration of this Sink instance',
    mimeType: 'application/json',
  },
]

function parseExpirationDuration(expiration: string | number | undefined): number | undefined {
  if (!expiration)
    return undefined
  if (typeof expiration === 'number')
    return expiration

  const str = String(expiration).trim().toLowerCase()
  const num = Number(str)
  if (!Number.isNaN(num) && num > 1000000000) {
    return Math.floor(num)
  }

  const now = Math.floor(Date.now() / 1000)
  const match = str.match(/^(\d+)\s*([smhdwy]?)$/)
  if (match) {
    const value = Number.parseInt(match[1], 10)
    const unit = match[2] || 's'
    switch (unit) {
      case 's': return now + value
      case 'm': return now + value * 60
      case 'h': return now + value * 3600
      case 'd': return now + value * 86400
      case 'w': return now + value * 86400 * 7
      case 'y': return now + value * 86400 * 365
    }
  }

  return undefined
}

export function isAuthorized(event: H3Event, explicitToken?: string): boolean {
  const headerToken = getHeader(event, 'Authorization')?.replace(/^Bearer\s+/, '')
  const token = explicitToken || headerToken
  const configToken = useRuntimeConfig(event).siteToken || ''
  const validTokens = configToken.split(',').map(t => t.trim()).filter(Boolean)

  if (validTokens.length === 0)
    return true
  return Boolean(token && validTokens.includes(token))
}

export async function executeMcpTool(event: H3Event, name: string, args: Record<string, any> = {}) {
  const { cloudflare } = event.context
  const KV = cloudflare?.env?.KV
  const origin = `${getRequestProtocol(event)}://${getRequestHost(event)}`

  switch (name) {
    case 'get_service_info': {
      const appConfig = useAppConfig(event)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                service: 'Sink URL Shortener',
                version: SERVER_INFO.version,
                protocolVersion: PROTOCOL_VERSION,
                siteTitle: appConfig.title,
                siteUrl: origin,
                features: {
                  analytics: Boolean(cloudflare?.env?.ANALYTICS),
                  kv: Boolean(KV),
                  webmcp: true,
                },
                endpoints: {
                  mcp: `${origin}/mcp`,
                  apiMcp: `${origin}/api/mcp`,
                },
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    case 'shorten_url': {
      if (!KV) {
        throw new Error('KV storage is not available')
      }

      const url = args.url?.trim()
      if (!url)
        throw new Error('url parameter is required')

      const isCustomSlug = args.isCustomSlug ?? Boolean(args.slug)
      const rawSlug = args.slug?.trim() || customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6)()
      const { caseSensitive } = useRuntimeConfig(event)
      const slug = caseSensitive ? rawSlug : rawSlug.toLowerCase()

      const parsedExpiration = parseExpirationDuration(args.expiration)
      const expiration = getExpiration(event, parsedExpiration)

      // Handle random reuse
      if (!isCustomSlug) {
        const existingRandomLink = await findRandomLinkByUrl(KV, url)
        if (existingRandomLink) {
          const shortLink = `${origin}/${existingRandomLink.slug}`
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'existing',
                    shortLink,
                    slug: existingRandomLink.slug,
                    url: existingRandomLink.url,
                    createdAt: existingRandomLink.createdAt,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }
      }

      // Check conflict
      const existing = await KV.get(`link:${slug}`)
      if (existing) {
        throw new Error(`Link with slug "${slug}" already exists`)
      }

      const linkRecord = LinkSchema.parse({
        url,
        slug,
        isCustomSlug,
        comment: args.comment,
        title: args.title,
        description: args.description,
        expiration,
      })

      await KV.put(`link:${slug}`, JSON.stringify(linkRecord), {
        expiration,
        metadata: {
          expiration,
          url: linkRecord.url,
          comment: linkRecord.comment,
        },
      })
      await putRandomLinkUrlIndex(KV, linkRecord, expiration)

      const shortLink = `${origin}/${slug}`
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'created',
                shortLink,
                slug,
                url,
                expiration,
                comment: linkRecord.comment,
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    case 'lookup_link': {
      if (!KV)
        throw new Error('KV storage is not available')
      const slug = args.slug?.trim()
      if (!slug)
        throw new Error('slug parameter is required')

      const { caseSensitive } = useRuntimeConfig(event)
      const lookupSlug = caseSensitive ? slug : slug.toLowerCase()

      const raw = await KV.get(`link:${lookupSlug}`, { type: 'json' })
      if (!raw) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Link not found', slug }, null, 2),
            },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(raw, null, 2),
          },
        ],
      }
    }

    case 'list_links': {
      if (!isAuthorized(event, args.token)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication required. Please provide a valid site token.',
            },
          ],
          isError: true,
        }
      }

      if (!KV)
        throw new Error('KV storage is not available')
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100)
      const list = await KV.list({
        prefix: 'link:',
        limit,
        cursor: args.cursor || undefined,
      })

      const links = await Promise.all(
        list.keys.map(async (key: { name: string }) => {
          const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
          return link ? { ...metadata, ...link } : metadata
        }),
      )

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                links: links.filter(Boolean),
                list_complete: list.list_complete,
                cursor: list.cursor,
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    case 'delete_link': {
      if (!isAuthorized(event, args.token)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication required. Please provide a valid site token.',
            },
          ],
          isError: true,
        }
      }

      if (!KV)
        throw new Error('KV storage is not available')
      const slug = args.slug?.trim()
      if (!slug)
        throw new Error('slug parameter is required')

      const { caseSensitive } = useRuntimeConfig(event)
      const targetSlug = caseSensitive ? slug : slug.toLowerCase()

      const link = await KV.get(`link:${targetSlug}`, { type: 'json' })
      if (link) {
        await deleteRandomLinkUrlIndex(KV, link as any)
        await KV.delete(`link:${targetSlug}`)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'deleted', slug: targetSlug }, null, 2),
            },
          ],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Link not found', slug: targetSlug }, null, 2),
          },
        ],
        isError: true,
      }
    }

    case 'get_link_analytics': {
      if (!isAuthorized(event, args.token)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication required. Please provide a valid site token to access analytics.',
            },
          ],
          isError: true,
        }
      }

      const slug = args.slug?.trim()
      if (!slug)
        throw new Error('slug parameter is required')

      const link = KV ? await KV.get(`link:${slug}`, { type: 'json' }) : null
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                slug,
                link,
                interval: args.interval || '7d',
                message: 'Detailed click analytics query is active through Analytics Engine.',
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export async function handleMcpRpcMessage(event: H3Event, body: any): Promise<any> {
  if (!body || typeof body !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: payload must be a JSON object' },
    }
  }

  const { id, method, params } = body

  // Notifications have no id
  const isNotification = typeof id === 'undefined' || id === null

  try {
    switch (method) {
      case 'initialize': {
        const result = {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {
              listChanged: false,
            },
            resources: {
              subscribe: false,
              listChanged: false,
            },
          },
          serverInfo: SERVER_INFO,
        }
        return isNotification ? null : { jsonrpc: '2.0', id, result }
      }

      case 'notifications/initialized': {
        return null
      }

      case 'ping': {
        return isNotification ? null : { jsonrpc: '2.0', id, result: {} }
      }

      case 'tools/list': {
        const result = {
          tools: MCP_TOOLS,
        }
        return isNotification ? null : { jsonrpc: '2.0', id, result }
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {}
        if (!name) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: tool name is required' },
          }
        }

        try {
          const toolResult = await executeMcpTool(event, name, toolArgs || {})
          return {
            jsonrpc: '2.0',
            id,
            result: toolResult,
          }
        }
        catch (err: any) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Error executing tool "${name}": ${err?.message || String(err)}`,
                },
              ],
              isError: true,
            },
          }
        }
      }

      case 'resources/list': {
        return isNotification ? null : { jsonrpc: '2.0', id, result: { resources: MCP_RESOURCES } }
      }

      case 'resources/read': {
        const uri = params?.uri
        if (uri === 'sink://info') {
          const origin = `${getRequestProtocol(event)}://${getRequestHost(event)}`
          const appConfig = useAppConfig(event)
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    service: 'Sink URL Shortener',
                    version: SERVER_INFO.version,
                    siteTitle: appConfig.title,
                    siteUrl: origin,
                  }),
                },
              ],
            },
          }
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Resource not found: ${uri}` },
        }
      }

      default: {
        return isNotification
          ? null
          : {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method not found: ${method}` },
            }
      }
    }
  }
  catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: `Internal error: ${err?.message || String(err)}` },
    }
  }
}

export function getMcpDiscoveryPayload(event: H3Event) {
  const origin = `${getRequestProtocol(event)}://${getRequestHost(event)}`
  const appConfig = useAppConfig(event)

  return {
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocolVersion: PROTOCOL_VERSION,
    title: appConfig.title,
    description: 'Sink URL Shortener MCP & WebMCP Service',
    endpoints: {
      mcp: `${origin}/mcp`,
      apiMcp: `${origin}/api/mcp`,
      bridge: `${origin}/.webmcp/bridge.js`,
    },
    capabilities: {
      tools: true,
      resources: true,
      webmcp: true,
    },
    tools: MCP_TOOLS,
  }
}

export const handleMcpEvent = eventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    setHeader(event, 'Content-Type', 'application/json')
    setHeader(event, 'Cache-Control', 'public, max-age=60')
    return getMcpDiscoveryPayload(event)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const results = await Promise.all(body.map(item => handleMcpRpcMessage(event, item)))
      return results.filter(Boolean)
    }

    const result = await handleMcpRpcMessage(event, body)
    if (result === null) {
      setResponseStatus(event, 204)
      return ''
    }
    return result
  }

  throw createError({
    status: 405,
    statusText: 'Method Not Allowed',
  })
})
