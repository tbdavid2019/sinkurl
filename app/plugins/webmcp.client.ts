export default defineNuxtPlugin(() => {
  if (!import.meta.client)
    return

  const modelContext = (navigator as any).modelContext || (document as any).modelContext
  if (!modelContext || typeof modelContext.registerTool !== 'function')
    return

  // Register WebMCP tools directly in browser runtime
  try {
    modelContext.registerTool({
      name: 'shorten_url',
      description: 'Shorten a destination URL into a short link with optional custom slug, expiration, and notes.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The destination URL to shorten',
          },
          slug: {
            type: 'string',
            description: 'Optional custom slug for the short link',
          },
          expiration: {
            type: 'string',
            description: 'Optional expiration duration (e.g. 1h, 1d, 7d, 30d)',
          },
          comment: {
            type: 'string',
            description: 'Optional note or comment for this link',
          },
        },
        required: ['url'],
      },
      execute: async (args: Record<string, any>) => {
        const res = await $fetch('/mcp', {
          method: 'POST',
          body: {
            jsonrpc: '2.0',
            id: `client-mcp-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'shorten_url',
              arguments: args,
            },
          },
        })
        return res
      },
    })

    modelContext.registerTool({
      name: 'lookup_link',
      description: 'Look up destination URL and metadata of an existing short link by slug.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The slug of the short link to look up',
          },
        },
        required: ['slug'],
      },
      execute: async (args: Record<string, any>) => {
        const res = await $fetch('/mcp', {
          method: 'POST',
          body: {
            jsonrpc: '2.0',
            id: `client-mcp-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'lookup_link',
              arguments: args,
            },
          },
        })
        return res
      },
    })
  }
  catch (err) {
    console.debug('[WebMCP Plugin] Error registering modelContext tools:', err)
  }
})
