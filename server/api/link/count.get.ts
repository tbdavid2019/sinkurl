export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  let count = 0
  let cursor: string | undefined

  while (true) {
    const list = await KV.list({
      prefix: 'link:',
      limit: 1000,
      cursor,
    })

    count += list.keys?.length || 0

    if (list.list_complete || !list.cursor) {
      break
    }

    cursor = list.cursor
  }

  return { count }
})
