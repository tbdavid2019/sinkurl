import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from './utils'

describe('mCP & WebMCP Endpoints', () => {
  describe('gET /mcp and GET /api/mcp (Discovery)', () => {
    it('returns server discovery payload on GET /mcp', async () => {
      const response = await fetch('/mcp')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('name', 'sink-mcp-server')
      expect(data).toHaveProperty('protocolVersion', '2024-11-05')
      expect(data.capabilities).toHaveProperty('webmcp', true)
      expect(data.capabilities).toHaveProperty('tools', true)
      expect(Array.isArray(data.tools)).toBe(true)
      expect(data.tools.some((t: any) => t.name === 'shorten_url')).toBe(true)
      expect(data.tools.some((t: any) => t.name === 'lookup_link')).toBe(true)
      expect(data.tools.some((t: any) => t.name === 'list_links')).toBe(true)
      expect(data.tools.some((t: any) => t.name === 'delete_link')).toBe(true)
    })

    it('returns server discovery payload on GET /api/mcp', async () => {
      const response = await fetch('/api/mcp')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('name', 'sink-mcp-server')
    })
  })

  describe('jSON-RPC 2.0 Protocol Methods', () => {
    it('handles initialize method', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'sink-mcp-server',
          },
        },
      })
    })

    it('handles ping method', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'ping',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        jsonrpc: '2.0',
        id: 2,
        result: {},
      })
    })

    it('handles notifications/initialized without body', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      })

      expect(response.status).toBe(204)
    })

    it('handles tools/list method', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list',
          params: {},
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result).toHaveProperty('tools')
      expect(data.result.tools.length).toBeGreaterThanOrEqual(4)
    })

    it('handles resources/list method', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'resources/list',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result).toHaveProperty('resources')
    })
  })

  describe('tool Execution (tools/call)', () => {
    it('executes get_service_info tool', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'get_service_info',
            arguments: {},
          },
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result).toHaveProperty('content')
      expect(data.result.content[0].text).toContain('Sink URL Shortener')
    })

    it('executes shorten_url tool and returns short link', async () => {
      const slug = `mcp-test-${Math.random().toString(36).slice(2)}`
      const url = `https://example.com/target-${slug}`

      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'shorten_url',
            arguments: {
              url,
              slug,
              expiration: '1d',
              comment: 'Created via MCP tool test',
            },
          },
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result).toHaveProperty('content')
      const parsedText = JSON.parse(data.result.content[0].text)
      expect(parsedText.status).toBe('created')
      expect(parsedText.slug).toBe(slug)
      expect(parsedText.shortLink).toContain(slug)

      // Verify lookup_link works for this created link
      const lookupRes = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'lookup_link',
            arguments: { slug },
          },
        }),
      })

      expect(lookupRes.status).toBe(200)
      const lookupData = await lookupRes.json()
      const lookupJson = JSON.parse(lookupData.result.content[0].text)
      expect(lookupJson.url).toBe(url)
    })

    it('rejects protected tools without authentication', async () => {
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/call',
          params: {
            name: 'list_links',
            arguments: {},
          },
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isError).toBe(true)
      expect(data.result.content[0].text).toContain('Authentication required')
    })

    it('allows protected tools with valid Bearer auth header', async () => {
      const response = await fetchWithAuth('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/call',
          params: {
            name: 'list_links',
            arguments: { limit: 5 },
          },
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isError).toBeUndefined()
      const listObj = JSON.parse(data.result.content[0].text)
      expect(listObj).toHaveProperty('links')
      expect(Array.isArray(listObj.links)).toBe(true)
    })

    it('deletes link with auth and verifies deletion', async () => {
      const slug = `to-delete-${Math.random().toString(36).slice(2)}`
      const url = `https://example.com/delete-target-${slug}`

      // Create link first
      await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'shorten_url',
            arguments: { url, slug },
          },
        }),
      })

      // Delete link with auth
      const deleteRes = await fetchWithAuth('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'delete_link',
            arguments: { slug },
          },
        }),
      })

      expect(deleteRes.status).toBe(200)
      const deleteData = await deleteRes.json()
      const deleteJson = JSON.parse(deleteData.result.content[0].text)
      expect(deleteJson.status).toBe('deleted')

      // Verify it's gone
      const lookupRes = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: {
            name: 'lookup_link',
            arguments: { slug },
          },
        }),
      })

      const lookupData = await lookupRes.json()
      expect(lookupData.result.isError).toBe(true)
    })
  })
})
