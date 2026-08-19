// Deliberate dual-route endpoint:
// /mcp serves as the default entry point for Cloudflare WebMCP edge injection & browser agents
import { handleMcpEvent } from '@@/server/utils/mcp'

export default handleMcpEvent
