// Deliberate dual-route endpoint:
// /api/mcp serves as the standard API convention endpoint for MCP clients (Claude Desktop, Cursor, etc.)
import { handleMcpEvent } from '@@/server/utils/mcp'

export default handleMcpEvent
