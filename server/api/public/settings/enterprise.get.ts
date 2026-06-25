export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  if (!cloudflare) {
    return { enabled: false, content: '' }
  }
  const { KV } = cloudflare.env
  const setting = await KV.get('setting:enterprise', { type: 'json' })
  return setting || { enabled: false, content: '' }
})
